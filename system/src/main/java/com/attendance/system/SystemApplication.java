package com.attendance.system;

import com.attendance.system.config.AttendanceImageStorageProperties;
import com.attendance.system.config.TrackingProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({TrackingProperties.class, AttendanceImageStorageProperties.class})
public class SystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(SystemApplication.class, args);
	}

}
