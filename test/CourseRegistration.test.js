const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CourseRegistration with IdentityNFT and FeePaymentNFT", function () {
  let CourseRegistration, CourseRegistrationNFT, CourseCompletionNFT, IdentityNFT, FeePaymentNFT;
  let courseRegistration, registrationNFT, completionNFT, identityNFT, feePaymentNFT;
  let owner, student1, student2, treasury;

  // Sample IPFS URIs for testing
  const registrationURI = "ipfs://registration_metadata";
  const completionURI = "ipfs://completion_metadata";
  const identityURI = "ipfs://identity_metadata";
  const feeURI = "ipfs://fee_metadata";

  beforeEach(async function () {
    // Get signers
    [owner, student1, student2, treasury] = await ethers.getSigners();

    // Deploy IdentityNFT
    IdentityNFT = await ethers.getContractFactory("IdentityNFT");
    identityNFT = await IdentityNFT.deploy();
    await identityNFT.waitForDeployment();

    // Deploy FeePaymentNFT
    FeePaymentNFT = await ethers.getContractFactory("FeePaymentNFT");
    feePaymentNFT = await FeePaymentNFT.deploy(treasury.address, await identityNFT.getAddress());
    await feePaymentNFT.waitForDeployment();

    // Deploy CourseRegistration with both NFT contract addresses
    CourseRegistration = await ethers.getContractFactory("CourseRegistration");
    courseRegistration = await CourseRegistration.deploy(
      await identityNFT.getAddress(),
      await feePaymentNFT.getAddress()
    );
    await courseRegistration.waitForDeployment();

    // Get NFT contract instances
    registrationNFT = await ethers.getContractAt("CourseRegistrationNFT", await courseRegistration.registrationNFT());
    completionNFT = await ethers.getContractAt("CourseCompletionNFT", await courseRegistration.completionNFT());

    // Mint IdentityNFT and FeePaymentNFT to student1
    await identityNFT.connect(owner).mintIdentity(student1.address, "student", identityURI);
    await feePaymentNFT.connect(student1).payFee("Spring 2025", feeURI, { value: ethers.parseEther("0.1") });
  });

  describe("Deployment", function () {
    it("should deploy with correct NFT contract addresses", async function () {
      expect(await courseRegistration.idNFTContract()).to.equal(await identityNFT.getAddress());
      expect(await courseRegistration.feePaymentNFTContract()).to.equal(await feePaymentNFT.getAddress());
    });

    it("should deploy child NFT contracts", async function () {
      expect(await registrationNFT.name()).to.equal("CourseRegistrationNFT");
      expect(await completionNFT.name()).to.equal("CourseCompletionNFT");
      expect(await registrationNFT.owner()).to.equal(await courseRegistration.getAddress());
      expect(await completionNFT.owner()).to.equal(await courseRegistration.getAddress());
    });

    it("should revert if deployed with zero address for IdentityNFT", async function () {
      await expect(
        CourseRegistration.deploy(ethers.ZeroAddress, await feePaymentNFT.getAddress())
      ).to.be.revertedWith("Invalid ID NFT contract address");
    });

    it("should revert if deployed with zero address for FeePaymentNFT", async function () {
      await expect(
        CourseRegistration.deploy(await identityNFT.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid Fee Payment NFT contract address");
    });
  });

  describe("Course Management", function () {
    it("should allow owner to add a course", async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      const course = await courseRegistration.getCourseDetails(1);
      expect(course.courseName).to.equal("Math 101");
      expect(course.instructor).to.equal("Prof. Smith");
      expect(course.duration).to.equal(12);
      expect(course.credits).to.equal(3);
      expect(course.active).to.be.true;
    });

    it("should revert if non-owner tries to add a course", async function () {
      await expect(
        courseRegistration.connect(student1).addCourse("Math 101", "Prof. Smith", 12, 3)
      ).to.be.revertedWithCustomError(courseRegistration, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to update a course", async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      await courseRegistration.connect(owner).updateCourse(1, "Math 102", "Prof. Jones", 10, 4);
      const course = await courseRegistration.getCourseDetails(1);
      expect(course.courseName).to.equal("Math 102");
      expect(course.instructor).to.equal("Prof. Jones");
      expect(course.duration).to.equal(10);
      expect(course.credits).to.equal(4);
    });

    it("should allow owner to deactivate a course", async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      await courseRegistration.connect(owner).deactivateCourse(1);
      const course = await courseRegistration.getCourseDetails(1);
      expect(course.active).to.be.false;
    });

    it("should allow owner to deactivate all courses", async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      await courseRegistration.connect(owner).addCourse("Physics 101", "Prof. Jones", 10, 4);
      await courseRegistration.connect(owner).deactivateAllCourses();
      const course1 = await courseRegistration.getCourseDetails(1);
      const course2 = await courseRegistration.getCourseDetails(2);
      expect(course1.active).to.be.false;
      expect(course2.active).to.be.false;
    });

    it("should revert if adding course with invalid parameters", async function () {
      await expect(
        courseRegistration.connect(owner).addCourse("", "Prof. Smith", 12, 3)
      ).to.be.revertedWith("Course name cannot be empty");
      await expect(
        courseRegistration.connect(owner).addCourse("Math 101", "", 12, 3)
      ).to.be.revertedWith("Instructor name cannot be empty");
      await expect(
        courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 0, 3)
      ).to.be.revertedWith("Duration must be greater than 0");
      await expect(
        courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 0)
      ).to.be.revertedWith("Credits must be greater than 0");
    });
  });

  describe("Registration", function () {
    beforeEach(async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
    });

    it("should allow a student with both IdentityNFT and FeePaymentNFT to register", async function () {
      await courseRegistration.connect(student1).register(1, registrationURI);
      const tokenId = await courseRegistration.getRegistrationTokenId(student1.address, 1);
      expect(await registrationNFT.ownerOf(tokenId)).to.equal(student1.address);
      expect(await registrationNFT.tokenURI(tokenId)).to.equal(registrationURI);
      expect(await courseRegistration.isStudentRegistered(student1.address, 1)).to.be.true;
      const students = await courseRegistration.getCourseStudents(1);
      expect(students).to.include(student1.address);
      expect(await courseRegistration.studentCourseCount(student1.address)).to.equal(1);
    });

    it("should revert if student has no IdentityNFT", async function () {
      // Mint FeePaymentNFT to student2 but not IdentityNFT
      await identityNFT.connect(owner).mintIdentity(student2.address, "student", identityURI);
      await feePaymentNFT.connect(student2).payFee("Spring 2025", feeURI, { value: ethers.parseEther("0.1") });
      await identityNFT.connect(owner).burn(2); // Burn student2's IdentityNFT (tokenId 2)
      await expect(
        courseRegistration.connect(student2).register(1, registrationURI)
      ).to.be.revertedWith("You must own a valid ID NFT to register");
    });

    it("should revert if student has no FeePaymentNFT", async function () {
      // Mint IdentityNFT to student2 but not FeePaymentNFT
      await identityNFT.connect(owner).mintIdentity(student2.address, "student", identityURI);
      await expect(
        courseRegistration.connect(student2).register(1, registrationURI)
      ).to.be.revertedWith("You must own a valid Fee Payment NFT to register");
    });

    it("should revert if student has neither NFT", async function () {
      await expect(
        courseRegistration.connect(student2).register(1, registrationURI)
      ).to.be.revertedWith("You must own a valid ID NFT to register");
    });

    it("should revert if student registers for a non-existent course", async function () {
      await expect(
        courseRegistration.connect(student1).register(2, registrationURI)
      ).to.be.revertedWith("Course does not exist");
    });

    it("should revert if student registers for an inactive course", async function () {
      await courseRegistration.connect(owner).deactivateCourse(1);
      await expect(
        courseRegistration.connect(student1).register(1, registrationURI)
      ).to.be.revertedWith("Course registration is not active");
    });

    it("should revert if student registers twice for the same course", async function () {
      await courseRegistration.connect(student1).register(1, registrationURI);
      await expect(
        courseRegistration.connect(student1).register(1, registrationURI)
      ).to.be.revertedWith("Already registered for this course");
    });

    it("should prevent transfer of CourseRegistrationNFT (soulbound)", async function () {
      await courseRegistration.connect(student1).register(1, registrationURI);
      const tokenId = await courseRegistration.getRegistrationTokenId(student1.address, 1);
      await expect(
        registrationNFT.connect(student1).transferFrom(student1.address, student2.address, tokenId)
      ).to.be.revertedWith("Registration NFTs are soulbound");
    });
  });

  describe("Grading", function () {
    beforeEach(async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      await courseRegistration.connect(student1).register(1, registrationURI);
    });

    it("should allow owner to submit a grade and issue CourseCompletionNFT", async function () {
      const registrationTokenId = await courseRegistration.getRegistrationTokenId(student1.address, 1);
      await courseRegistration.connect(owner).submitGrade(student1.address, 1, 8, completionURI);
      
      // Check registration NFT is burned
      await expect(registrationNFT.ownerOf(registrationTokenId)).to.be.revertedWithCustomError(
        registrationNFT,
        "ERC721NonexistentToken"
      );
      
      // Check completion NFT is minted
      const completionTokenId = await courseRegistration.getCompletionTokenId(student1.address, 1);
      expect(await completionNFT.ownerOf(completionTokenId)).to.equal(student1.address);
      expect(await completionNFT.tokenURI(completionTokenId)).to.equal(completionURI);
      
      // Check registration cleanup
      expect(await courseRegistration.isStudentRegistered(student1.address, 1)).to.be.false;
      const students = await courseRegistration.getCourseStudents(1);
      expect(students).to.not.include(student1.address);
      expect(await courseRegistration.studentCourseCount(student1.address)).to.equal(0);
    });

    it("should revert if non-owner tries to submit a grade", async function () {
      await expect(
        courseRegistration.connect(student2).submitGrade(student1.address, 1, 8, completionURI)
      ).to.be.revertedWithCustomError(courseRegistration, "OwnableUnauthorizedAccount");
    });

    it("should revert if grade exceeds 10", async function () {
      await expect(
        courseRegistration.connect(owner).submitGrade(student1.address, 1, 11, completionURI)
      ).to.be.revertedWith("Grade must be between 0 and 10");
    });

    it("should revert if student is not registered", async function () {
      await expect(
        courseRegistration.connect(owner).submitGrade(student2.address, 1, 8, completionURI)
      ).to.be.revertedWith("Student not registered");
    });

    it("should revert if grade is submitted twice", async function () {
      await courseRegistration.connect(owner).submitGrade(student1.address, 1, 8, completionURI);
      await expect(
        courseRegistration.connect(owner).submitGrade(student1.address, 1, 9, completionURI)
      ).to.be.revertedWith("Grade already submitted");
    });

    it("should prevent transfer of CourseCompletionNFT (soulbound)", async function () {
      await courseRegistration.connect(owner).submitGrade(student1.address, 1, 8, completionURI);
      const completionTokenId = await courseRegistration.getCompletionTokenId(student1.address, 1);
      await expect(
        completionNFT.connect(student1).transferFrom(student1.address, student2.address, completionTokenId)
      ).to.be.revertedWith("Completion NFTs are soulbound");
    });

    it("should revert if submitting grade for non-existent course", async function () {
      await expect(
        courseRegistration.connect(owner).submitGrade(student1.address, 2, 8, completionURI)
      ).to.be.revertedWith("Course does not exist");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      await courseRegistration.connect(student1).register(1, registrationURI);
    });

    it("should return correct course details", async function () {
      const course = await courseRegistration.getCourseDetails(1);
      expect(course.courseName).to.equal("Math 101");
      expect(course.instructor).to.equal("Prof. Smith");
      expect(course.duration).to.equal(12);
      expect(course.credits).to.equal(3);
      expect(course.active).to.be.true;
    });

    it("should return all courses", async function () {
      await courseRegistration.connect(owner).addCourse("Physics 101", "Prof. Jones", 10, 4);
      const courses = await courseRegistration.getAllCourses();
      expect(courses.length).to.equal(2);
      expect(courses[0].courseName).to.equal("Math 101");
      expect(courses[1].courseName).to.equal("Physics 101");
    });

    it("should return correct course count", async function () {
      expect(await courseRegistration.getCourseCount()).to.equal(1);
      await courseRegistration.connect(owner).addCourse("Physics 101", "Prof. Jones", 10, 4);
      expect(await courseRegistration.getCourseCount()).to.equal(2);
    });

    it("should return correct student registration status", async function () {
      expect(await courseRegistration.isStudentRegistered(student1.address, 1)).to.be.true;
      expect(await courseRegistration.isStudentRegistered(student2.address, 1)).to.be.false;
    });

    it("should return correct course students", async function () {
      const students = await courseRegistration.getCourseStudents(1);
      expect(students).to.include(student1.address);
      expect(students).to.not.include(student2.address);
    });
  });

  describe("Integration with IdentityNFT and FeePaymentNFT", function () {
    it("should allow registration only with both active NFTs", async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      await courseRegistration.connect(student1).register(1, registrationURI);
      expect(await courseRegistration.isStudentRegistered(student1.address, 1)).to.be.true;

      // Burn IdentityNFT and check registration persists (CourseRegistration doesn't recheck)
      await identityNFT.connect(owner).burn(1);
      expect(await courseRegistration.isStudentRegistered(student1.address, 1)).to.be.true;

      // Note: FeePaymentNFT burning isn't directly supported, but balanceOf would decrease if implemented
    });

    it("should prevent multiple IdentityNFTs for the same address", async function () {
      await expect(
        identityNFT.connect(owner).mintIdentity(student1.address, "student2", identityURI)
      ).to.be.revertedWith("Recipient already has a token");
    });

    it("should update FeePaymentNFT and still allow registration", async function () {
      await courseRegistration.connect(owner).addCourse("Math 101", "Prof. Smith", 12, 3);
      // Pay fee again to update FeePaymentNFT
      await feePaymentNFT.connect(student1).payFee("Fall 2025", feeURI, { value: ethers.parseEther("0.2") });
      await courseRegistration.connect(student1).register(1, registrationURI);
      expect(await courseRegistration.isStudentRegistered(student1.address, 1)).to.be.true;
    });
  });
});