import GuideApplication from "../models/guideModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// Guide Registration
export const applyGuide = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      password, 
      experience, 
      languages, 
      destinations, 
      bio, 
      hourlyRate 
    } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !experience || !languages || !destinations || !bio || !hourlyRate) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    // Check if email already exists
    const existingGuide = await GuideApplication.findOne({ email });
    if (existingGuide) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification OTP
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Handle profile image
    let profileImage = "";
    if (req.file) {
      profileImage = `/uploads/guides/${req.file.filename}`;
    }

    const newApplication = new GuideApplication({
      name,
      email,
      phone,
      password: hashedPassword,
      experience,
      languages: Array.isArray(languages) ? languages : [languages],
      destinations: Array.isArray(destinations) ? destinations : [destinations],
      bio,
      hourlyRate: parseFloat(hourlyRate),
      verificationOtp,
      verificationOtpExpireAt,
      profileImage
    });

    await newApplication.save();

    // Send verification email
    await sendVerificationEmail(newApplication);

    // Send notification email to Admin
    await sendEmailToAdmin(newApplication);

    res.status(201).json({ 
      success: true,
      message: "Application submitted successfully! Please check your email for verification." 
    });
  } catch (error) {
    console.error("Error in guide application:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal Server Error" 
    });
  }
};

// Guide Login
export const guideLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    const guide = await GuideApplication.findOne({ email });
    if (!guide) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Check if guide is approved
    if (guide.status !== "approved") {
      return res.status(401).json({ 
        success: false,
        message: "Your application is still under review. Please wait for approval." 
      });
    }

    // Check if email is verified
    if (!guide.isEmailVerified) {
      return res.status(401).json({ 
        success: false,
        message: "Please verify your email first" 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, guide.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { guideId: guide._id, email: guide.email, status: guide.status },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      success: true,
      message: "Guide login successful",
      token,
      guide: {
        id: guide._id,
        name: guide.name,
        email: guide.email,
        status: guide.status,
        rating: guide.rating,
        toursCompleted: guide.toursCompleted
      }
    });

  } catch (error) {
    console.error("Guide login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Verify Email OTP
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: "Email and OTP are required" 
      });
    }

    const guide = await GuideApplication.findOne({ email });
    if (!guide) {
      return res.status(404).json({ 
        success: false,
        message: "Guide not found" 
      });
    }

    if (guide.isEmailVerified) {
      return res.status(400).json({ 
        success: false,
        message: "Email already verified" 
      });
    }

    if (guide.verificationOtp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid OTP" 
      });
    }

    if (Date.now() > guide.verificationOtpExpireAt) {
      return res.status(400).json({ 
        success: false,
        message: "OTP has expired" 
      });
    }

    guide.isEmailVerified = true;
    guide.verificationOtp = "";
    guide.verificationOtpExpireAt = 0;
    await guide.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully!"
    });

  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Resend verification OTP
export const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }

    const guide = await GuideApplication.findOne({ email });
    if (!guide) {
      return res.status(404).json({ 
        success: false,
        message: "Guide not found" 
      });
    }

    if (guide.isEmailVerified) {
      return res.status(400).json({ 
        success: false,
        message: "Email already verified" 
      });
    }

    // Generate new OTP
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationOtpExpireAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    guide.verificationOtp = verificationOtp;
    guide.verificationOtpExpireAt = verificationOtpExpireAt;
    await guide.save();

    // Send new verification email
    await sendVerificationEmail(guide);

    res.status(200).json({
      success: true,
      message: "Verification OTP resent successfully!"
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Get approved guides for public view
export const getApprovedGuides = async (req, res) => {
  try {
    const { destination, language, page = 1, limit = 10 } = req.query;
    
    let query = { status: "approved", isActive: true };
    
    if (destination) {
      query.destinations = { $in: [new RegExp(destination, 'i')] };
    }
    
    if (language) {
      query.languages = { $in: [new RegExp(language, 'i')] };
    }

    const skip = (page - 1) * limit;
    
    const guides = await GuideApplication.find(query)
      .select("-password -verificationOtp -verificationOtpExpireAt -adminNotes")
      .sort({ rating: -1, toursCompleted: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await GuideApplication.countDocuments(query);

    res.status(200).json({
      success: true,
      guides,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalGuides: total,
        hasNext: skip + guides.length < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Get approved guides error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Get guide profile (for authenticated guide)
export const getGuideProfile = async (req, res) => {
  try {
    const guideId = req.guide.guideId;
    
    const guide = await GuideApplication.findById(guideId)
      .select("-password -verificationOtp -verificationOtpExpireAt");

    if (!guide) {
      return res.status(404).json({ 
        success: false,
        message: "Guide not found" 
      });
    }

    res.status(200).json({
      success: true,
      guide
    });

  } catch (error) {
    console.error("Get guide profile error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Send Email to Admin
const sendEmailToAdmin = async (application) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "New Guide Application Received",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Guide Application</h2>
          <p><strong>Name:</strong> ${application.name}</p>
          <p><strong>Email:</strong> ${application.email}</p>
          <p><strong>Phone:</strong> ${application.phone}</p>
          <p><strong>Experience:</strong> ${application.experience}</p>
          <p><strong>Languages:</strong> ${application.languages.join(', ')}</p>
          <p><strong>Destinations:</strong> ${application.destinations.join(', ')}</p>
          <p><strong>Hourly Rate:</strong> ₹${application.hourlyRate}</p>
          <p><strong>Bio:</strong> ${application.bio}</p>
          <p>Login to Admin Panel to Approve or Reject this application.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to Admin!");
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
};

// Send verification email
const sendVerificationEmail = async (application) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: application.email,
      subject: "Verify Your Email - TravelXGuide Guide Application",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>Dear ${application.name},</p>
          <p>Thank you for applying to become a guide with TravelXGuide!</p>
          <p>Please use the following verification code to complete your registration:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0;">${application.verificationOtp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>Best regards,<br>TravelXGuide Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Verification email sent to guide!");
  } catch (error) {
    console.error("❌ Failed to send verification email:", error);
  }
};
