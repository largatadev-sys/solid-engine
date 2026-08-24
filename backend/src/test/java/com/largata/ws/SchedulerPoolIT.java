package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.TaskScheduler;

@SpringBootTest
class SchedulerPoolIT extends PostgresTestBase {

    private static final Duration PATIENCE = Duration.ofSeconds(10);

    private static final Duration THE_STALL = Duration.ofSeconds(30);

    @Autowired private TaskScheduler scheduler;

    @Test
    void oneStalledScheduledTaskDoesNotHoldUpAnother() throws Exception {
        CountDownLatch stalledTaskIsRunning = new CountDownLatch(1);
        CountDownLatch releaseTheStalledTask = new CountDownLatch(1);
        CountDownLatch theSecondTaskRan = new CountDownLatch(1);

        scheduler.schedule(
                () -> {
                    stalledTaskIsRunning.countDown();
                    spinUntilReleased(releaseTheStalledTask);
                },
                Instant.now().plusMillis(50));
        assertThat(stalledTaskIsRunning.await(PATIENCE.toSeconds(), TimeUnit.SECONDS))
                .as("The stalled task must actually be occupying a scheduler thread before the"
                        + " second one is offered, or this proves nothing about contention.")
                .isTrue();

        scheduler.schedule(theSecondTaskRan::countDown, Instant.now().plusMillis(50));

        try {
            assertThat(theSecondTaskRan.await(PATIENCE.toSeconds(), TimeUnit.SECONDS))
                    .as("Heartbeats.pingEverySession and sweepExpiredTickets share the scheduler."
                            + " On Boot's single-threaded default a task that stalls — a ping walking"
                            + " a wedged socket — holds up every other scheduled task behind it, so"
                            + " the mechanism that detects dead sessions is blocked by dead sessions."
                            + " This fails without a pooled TaskScheduler bean.")
                    .isTrue();
        } finally {
            releaseTheStalledTask.countDown();
        }
    }

    @Test
    void theSchedulerIsPooledRatherThanBootsSingleThreadedDefault() {
        assertThat(scheduler)
                .as("Boot supplies a single-threaded scheduler when no TaskScheduler bean exists,"
                        + " and it does so silently — nothing goes red, the tasks simply queue behind"
                        + " each other. The bean's existence is the cheap structural signal.")
                .isInstanceOf(org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler.class);

        assertThat(
                        ((org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler) scheduler)
                                .getPoolSize())
                .isGreaterThan(1);
    }

    private static void spinUntilReleased(CountDownLatch latch) {
        long deadline = System.nanoTime() + THE_STALL.toNanos();
        while (latch.getCount() > 0 && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
    }
}
