package com.largata.support;

import org.hibernate.resource.jdbc.spi.StatementInspector;


public final class ThreadLocalStatementCounter implements StatementInspector {

    private static final ThreadLocal<int[]> COUNT = ThreadLocal.withInitial(() -> new int[1]);


    @Override
    public String inspect(String sql) {
        COUNT.get()[0]++;
        return sql;
    }


    public static void reset() {
        COUNT.get()[0] = 0;
    }


    public static int onThisThread() {
        return COUNT.get()[0];
    }
}
