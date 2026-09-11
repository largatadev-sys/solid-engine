package com.largata.verification.repository;

import com.largata.verification.entity.VerificationCode;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {}
