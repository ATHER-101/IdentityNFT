// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // Updated to match RewardNFT

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// CourseRegistrationNFT contract
contract CourseRegistrationNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private nextTokenId = 1;

    constructor(address _owner) 
        ERC721("CourseRegistrationNFT", "CRNFT") 
        Ownable(_owner) 
    {}

    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        nextTokenId++;
        return tokenId;
    }

    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Registration NFTs are soulbound");
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// CourseCompletionNFT contract
contract CourseCompletionNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private nextTokenId = 1;

    constructor(address _owner) 
        ERC721("CourseCompletionNFT", "CCNFT") 
        Ownable(_owner) 
    {}

    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = nextTokenId;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        nextTokenId++;
        return tokenId;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Completion NFTs are soulbound");
        }
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

// Interface for RewardNFT
interface IRewardNFT {
    function mintMultipleRewards(address student, uint256 n) external;
}

// Main CourseRegistration contract
contract CourseRegistration is Ownable {
    struct Course {
        uint256 courseId;
        string courseName;
        string instructor;
        uint256 duration;
        uint256 credits;
        bool exists;
        bool active;
    }

    struct Registration {
        uint256 courseId;
        address student;
        uint256 tokenId;
        bool exists;
    }

    mapping(uint256 => Course) public courses;
    uint256 public nextCourseId = 1;
    
    mapping(address => mapping(uint256 => Registration)) public registrations;
    mapping(address => uint256) public studentCourseCount;
    mapping(uint256 => address[]) public courseStudents;
    mapping(address => mapping(uint256 => uint256)) public completionTokens;

    CourseRegistrationNFT public registrationNFT;
    CourseCompletionNFT public completionNFT;
    IRewardNFT public rewardNFT; // Reference to separately deployed RewardNFT
    IERC721 public idNFTContract;
    IERC721 public feePaymentNFTContract;

    constructor(
        address _idNFTContract, 
        address _feePaymentNFTContract, 
        address _rewardNFTAddress
    ) Ownable(msg.sender) {
        require(_idNFTContract != address(0), "Invalid ID NFT contract address");
        require(_feePaymentNFTContract != address(0), "Invalid Fee Payment NFT contract address");
        require(_rewardNFTAddress != address(0), "Invalid Reward NFT contract address");

        idNFTContract = IERC721(_idNFTContract);
        feePaymentNFTContract = IERC721(_feePaymentNFTContract);
        rewardNFT = IRewardNFT(_rewardNFTAddress);

        registrationNFT = new CourseRegistrationNFT(address(this));
        completionNFT = new CourseCompletionNFT(address(this));
    }

    function addCourse(
        string memory _courseName,
        string memory _instructor,
        uint256 _duration,
        uint256 _credits
    ) external onlyOwner {
        require(bytes(_courseName).length > 0, "Course name cannot be empty");
        require(bytes(_instructor).length > 0, "Instructor name cannot be empty");
        require(_duration > 0, "Duration must be greater than 0");
        require(_credits > 0, "Credits must be greater than 0");

        courses[nextCourseId] = Course({
            courseId: nextCourseId,
            courseName: _courseName,
            instructor: _instructor,
            duration: _duration,
            credits: _credits,
            exists: true,
            active: true
        });
        
        nextCourseId++;
    }

    function register(uint256 _courseId, string memory _tokenURI) external {
        require(idNFTContract.balanceOf(msg.sender) > 0, "You must own a valid ID NFT to register");
        require(feePaymentNFTContract.balanceOf(msg.sender) > 0, "You must own a valid Fee Payment NFT to register");
        require(courses[_courseId].exists, "Course does not exist");
        require(courses[_courseId].active, "Course registration is not active");
        require(!registrations[msg.sender][_courseId].exists, "Already registered for this course");
        
        uint256 tokenId = registrationNFT.mint(msg.sender, _tokenURI);

        Registration memory newRegistration = Registration({
            courseId: _courseId,
            student: msg.sender,
            tokenId: tokenId,
            exists: true
        });

        registrations[msg.sender][_courseId] = newRegistration;
        studentCourseCount[msg.sender]++;
        courseStudents[_courseId].push(msg.sender);
    }

    function submitGrade(
        address _student,
        uint256 _courseId,
        uint8 _grade,
        string memory _completionTokenURI
    ) external onlyOwner {
        require(courses[_courseId].exists, "Course does not exist");
        require(completionTokens[_student][_courseId] == 0, "Grade already submitted");
        require(registrations[_student][_courseId].exists, "Student not registered");
        require(_grade <= 10, "Grade must be between 0 and 10");

        uint256 registrationTokenId = registrations[_student][_courseId].tokenId;
        registrationNFT.burn(registrationTokenId);

        delete registrations[_student][_courseId];
        studentCourseCount[_student]--;
        
        address[] storage students = courseStudents[_courseId];
        for (uint256 i = 0; i < students.length; i++) {
            if (students[i] == _student) {
                students[i] = students[students.length - 1];
                students.pop();
                break;
            }
        }

        uint256 completionTokenId = completionNFT.mint(_student, _completionTokenURI);
        completionTokens[_student][_courseId] = completionTokenId;

        uint256 rewardCount = uint256(_grade) * 2;
        if (rewardCount > 0) {
            rewardNFT.mintMultipleRewards(_student, rewardCount);
        }
    }

    // Remaining functions unchanged
    function getRegistrationTokenId(address _student, uint256 _courseId) 
        external 
        view 
        returns (uint256) 
    {
        require(registrations[_student][_courseId].exists, "Registration does not exist");
        return registrations[_student][_courseId].tokenId;
    }

    function getCompletionTokenId(address _student, uint256 _courseId) 
        external 
        view 
        returns (uint256) 
    {
        require(completionTokens[_student][_courseId] != 0, "No completion NFT for this course");
        return completionTokens[_student][_courseId];
    }

    function getCourseStudents(uint256 _courseId) 
        external 
        view 
        returns (address[] memory) 
    {
        require(courses[_courseId].exists, "Course does not exist");
        return courseStudents[_courseId];
    }

    function isStudentRegistered(address _student, uint256 _courseId) 
        external 
        view 
        returns (bool) 
    {
        return registrations[_student][_courseId].exists;
    }

    function activateCourse(uint256 _courseId) external onlyOwner {
        require(courses[_courseId].exists, "Course does not exist");
        require(!courses[_courseId].active, "Course is already active");
        courses[_courseId].active = true;
    }

    function deactivateCourse(uint256 _courseId) external onlyOwner {
        require(courses[_courseId].exists, "Course does not exist");
        require(courses[_courseId].active, "Course is already inactive");
        courses[_courseId].active = false;
    }

    function deactivateAllCourses() external onlyOwner {
        for (uint256 i = 1; i < nextCourseId; i++) {
            if (courses[i].active) {
                courses[i].active = false;
            }
        }
    }

    function updateCourse(
        uint256 _courseId,
        string memory _courseName,
        string memory _instructor,
        uint256 _duration,
        uint256 _credits
    ) external onlyOwner {
        require(courses[_courseId].exists, "Course does not exist");
        require(bytes(_courseName).length > 0, "Course name cannot be empty");
        require(bytes(_instructor).length > 0, "Instructor name cannot be empty");
        require(_duration > 0, "Duration must be greater than 0");
        require(_credits > 0, "Credits must be greater than 0");

        Course storage course = courses[_courseId];
        course.courseName = _courseName;
        course.instructor = _instructor;
        course.duration = _duration;
        course.credits = _credits;
    }

    function getCourseDetails(uint256 _courseId) 
        external 
        view 
        returns (
            string memory courseName,
            string memory instructor,
            uint256 duration,
            uint256 credits,
            bool active
        ) 
    {
        require(courses[_courseId].exists, "Course does not exist");
        Course memory course = courses[_courseId];
        return (
            course.courseName,
            course.instructor,
            course.duration,
            course.credits,
            course.active
        );
    }

    function getAllCourses() 
        external 
        view 
        returns (Course[] memory) 
    {
        Course[] memory allCourses = new Course[](nextCourseId - 1);
        for (uint256 i = 1; i < nextCourseId; i++) {
            allCourses[i - 1] = courses[i];
        }
        return allCourses;
    }

    function getCourseCount() external view returns (uint256) {
        return nextCourseId - 1;
    }
}