package com.largata.report;


public record RelayOutcome(Verdict verdict, String detail) {

    public enum Verdict {
        DELIVERED,
        REFUSED,
        UNREACHABLE
    }


    public static RelayOutcome delivered() {
        return new RelayOutcome(Verdict.DELIVERED, null);
    }


    public static RelayOutcome refused(String detail) {
        return new RelayOutcome(Verdict.REFUSED, detail);
    }


    public static RelayOutcome unreachable(String detail) {
        return new RelayOutcome(Verdict.UNREACHABLE, detail);
    }
}
