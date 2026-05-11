package com.unihub;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class UnihubApplication {
  private static final String APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

  public static void main(String[] args) {
    TimeZone.setDefault(TimeZone.getTimeZone(APP_TIME_ZONE));
    SpringApplication.run(UnihubApplication.class, args);
  }
}

