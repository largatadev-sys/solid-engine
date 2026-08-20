package com.largata.ws;


public interface EventFanout {

    void broadcast(Topic topic, String type, Object payload);
}
