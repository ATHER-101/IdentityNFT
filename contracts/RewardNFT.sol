// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardNFT is ERC721, ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;
    uint256[] private _adminTokens;
    IERC721 public idNFTContract;
    mapping(address => bool) public authorizedCallers;

    struct AccessPoint {
        string location; // e.g., "Gym", "Mess", "Library"
        address account; // Ethereum address of the access point
        uint256 cost; // Number of RewardNFTs required
        bool active;
    }
    mapping(string => AccessPoint) public accessPoints; // Keyed by location string

    event RewardUsed(address indexed user, uint256 tokenId);
    event RewardReused(address indexed student, uint256 tokenId);
    event RewardMinted(address indexed student, uint256 tokenId);
    event AccessPointAdded(string indexed location, address account, uint256 cost);
    event AccessPointUpdated(string indexed location, address account, uint256 cost);
    event AccessPointDeactivated(string indexed location);
    event AccessGranted(address indexed user, string indexed location);

    constructor(address _idNFTContract) ERC721("RewardNFT", "RNFT") Ownable(msg.sender) {
        require(_idNFTContract != address(0), "Invalid IdentityNFT contract address");
        idNFTContract = IERC721(_idNFTContract);
        _tokenIdCounter = 0;
    }

    modifier onlyOwnerOrAuthorized() {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Caller not authorized");
        _;
    }

    function addAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "Invalid caller address");
        authorizedCallers[caller] = true;
    }

    function removeAuthorizedCaller(address caller) external onlyOwner {
        authorizedCallers[caller] = false;
    }

    function addAccessPoint(string memory location, address account, uint256 cost) external onlyOwner {
        require(bytes(location).length > 0, "Invalid location");
        require(account != address(0), "Invalid account address");
        require(cost > 0, "Cost must be greater than 0");
        require(!accessPoints[location].active, "Access point already exists");

        accessPoints[location] = AccessPoint(location, account, cost, true);
        emit AccessPointAdded(location, account, cost);
    }

    function updateAccessPoint(string memory location, address newAccount, uint256 newCost) external onlyOwner {
        require(accessPoints[location].active, "Access point does not exist");
        require(newAccount != address(0), "Invalid account address");
        require(newCost > 0, "Cost must be greater than 0");

        accessPoints[location].account = newAccount;
        accessPoints[location].cost = newCost;
        emit AccessPointUpdated(location, newAccount, newCost);
    }

    function deactivateAccessPoint(string memory location) external onlyOwner {
        require(accessPoints[location].active, "Access point does not exist");

        accessPoints[location].active = false;
        emit AccessPointDeactivated(location);
    }

    function requestAccess(string memory location, address user) external {
        AccessPoint memory accessPoint = accessPoints[location];
        require(accessPoint.active, "Access point is not active");
        require(msg.sender == accessPoint.account, "Caller must be access point account");
        require(idNFTContract.balanceOf(user) > 0, "User must own an IdentityNFT");
        require(balanceOf(user) >= accessPoint.cost, "User does not have enough RewardNFTs");

        uint256 tokensTransferred = 0;
        for (uint256 i = 0; i < accessPoint.cost; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(user, i);
            _transfer(user, owner(), tokenId);
            _adminTokens.push(tokenId);
            emit RewardUsed(user, tokenId);
            tokensTransferred++;
        }

        emit AccessGranted(user, location);
    }

    function mintMultipleRewards(address student, uint256 n) external onlyOwnerOrAuthorized {
        require(student != address(0), "Invalid student address");
        require(idNFTContract.balanceOf(student) > 0, "Student must own an IdentityNFT");
        require(n > 0, "Number of NFTs must be greater than 0");

        for (uint256 i = 0; i < n; i++) {
            if (_adminTokens.length > 0) {
                uint256 tokenIdToReuse = _adminTokens[_adminTokens.length - 1];
                _adminTokens.pop();
                _transfer(owner(), student, tokenIdToReuse);
                emit RewardReused(student, tokenIdToReuse);
            } else {
                _tokenIdCounter++;
                _mint(student, _tokenIdCounter);
                emit RewardMinted(student, _tokenIdCounter);
            }
        }
    }

    function mintReward(address student) external onlyOwnerOrAuthorized {
        require(student != address(0), "Invalid student address");
        require(idNFTContract.balanceOf(student) > 0, "Student must own an IdentityNFT");

        if (_adminTokens.length > 0) {
            uint256 tokenIdToReuse = _adminTokens[_adminTokens.length - 1];
            _adminTokens.pop();
            _transfer(owner(), student, tokenIdToReuse);
            emit RewardReused(student, tokenIdToReuse);
        } else {
            _tokenIdCounter++;
            _mint(student, _tokenIdCounter);
            emit RewardMinted(student, _tokenIdCounter);
        }
    }

    function useReward(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "You do not own this NFT");
        _transfer(msg.sender, owner(), tokenId);
        _adminTokens.push(tokenId);
        emit RewardUsed(msg.sender, tokenId);
    }

    function getAdminTokens() external view returns (uint256[] memory) {
        return _adminTokens;
    }

    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function setIdNFTContract(address _newIdNFTContract) external onlyOwner {
        require(_newIdNFTContract != address(0), "Invalid IdentityNFT contract address");
        idNFTContract = IERC721(_newIdNFTContract);
    }

    // Required to support ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && to != owner()) {
            require(idNFTContract.balanceOf(to) > 0, "Recipient must own an IdentityNFT");
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    // Required to support ERC721Enumerable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}