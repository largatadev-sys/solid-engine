package com.largata.ws;


public class DebugEchoTopic {

    public static final String EVENT_TYPE = "debug.echo";

    private final EventFanout fanout;

    public DebugEchoTopic(EventFanout fanout) {
        this.fanout = fanout;
    }


    public void echo(Object payload) {
        fanout.broadcast(Topic.debugEcho(), EVENT_TYPE, payload);
    }
}
