package com.largata.verification;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {}
