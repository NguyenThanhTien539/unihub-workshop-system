package com.unihub.infrastructure.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {
  private boolean enabled = true;
  private String algorithm = "token-bucket";
  private boolean trustForwardedFor = false;
  private int defaultIpLimit = 120;
  private int defaultIpRefillTokens = 120;
  private long defaultIpRefillPeriodSeconds = 60;
  private Policies policies = new Policies();

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getAlgorithm() {
    return algorithm;
  }

  public void setAlgorithm(String algorithm) {
    this.algorithm = algorithm;
  }

  public boolean isTrustForwardedFor() {
    return trustForwardedFor;
  }

  public void setTrustForwardedFor(boolean trustForwardedFor) {
    this.trustForwardedFor = trustForwardedFor;
  }

  public int getDefaultIpLimit() {
    return defaultIpLimit;
  }

  public void setDefaultIpLimit(int defaultIpLimit) {
    this.defaultIpLimit = defaultIpLimit;
  }

  public int getDefaultIpRefillTokens() {
    return defaultIpRefillTokens;
  }

  public void setDefaultIpRefillTokens(int defaultIpRefillTokens) {
    this.defaultIpRefillTokens = defaultIpRefillTokens;
  }

  public long getDefaultIpRefillPeriodSeconds() {
    return defaultIpRefillPeriodSeconds;
  }

  public void setDefaultIpRefillPeriodSeconds(long defaultIpRefillPeriodSeconds) {
    this.defaultIpRefillPeriodSeconds = defaultIpRefillPeriodSeconds;
  }

  public Policies getPolicies() {
    return policies;
  }

  public void setPolicies(Policies policies) {
    this.policies = policies;
  }

  public RateLimitPolicy defaultIpPolicy() {
    return new RateLimitPolicy(
        "default-ip",
        defaultIpLimit,
        defaultIpRefillTokens,
        defaultIpRefillPeriodSeconds);
  }

  public static class Policies {
    private Policy login = new Policy(10, 10, 60);
    private Policy authRefresh = new Policy(30, 30, 60);
    private Policy registration = new Policy(5, 5, 60);
    private Policy payment = new Policy(10, 10, 60);
    private Policy checkinSync = new Policy(30, 30, 60);

    public Policy getLogin() {
      return login;
    }

    public void setLogin(Policy login) {
      this.login = login;
    }

    public Policy getAuthRefresh() {
      return authRefresh;
    }

    public void setAuthRefresh(Policy authRefresh) {
      this.authRefresh = authRefresh;
    }

    public Policy getRegistration() {
      return registration;
    }

    public void setRegistration(Policy registration) {
      this.registration = registration;
    }

    public Policy getPayment() {
      return payment;
    }

    public void setPayment(Policy payment) {
      this.payment = payment;
    }

    public Policy getCheckinSync() {
      return checkinSync;
    }

    public void setCheckinSync(Policy checkinSync) {
      this.checkinSync = checkinSync;
    }
  }

  public static class Policy {
    private int capacity;
    private int refillTokens;
    private long refillPeriodSeconds;

    public Policy() {
    }

    public Policy(int capacity, int refillTokens, long refillPeriodSeconds) {
      this.capacity = capacity;
      this.refillTokens = refillTokens;
      this.refillPeriodSeconds = refillPeriodSeconds;
    }

    public int getCapacity() {
      return capacity;
    }

    public void setCapacity(int capacity) {
      this.capacity = capacity;
    }

    public int getRefillTokens() {
      return refillTokens;
    }

    public void setRefillTokens(int refillTokens) {
      this.refillTokens = refillTokens;
    }

    public long getRefillPeriodSeconds() {
      return refillPeriodSeconds;
    }

    public void setRefillPeriodSeconds(long refillPeriodSeconds) {
      this.refillPeriodSeconds = refillPeriodSeconds;
    }

    public RateLimitPolicy toPolicy(String name) {
      return new RateLimitPolicy(name, capacity, refillTokens, refillPeriodSeconds);
    }
  }
}
