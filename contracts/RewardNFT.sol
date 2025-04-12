// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    uint256[] private _adminTokens;
    IERC721 public idNFTContract;
    mapping(address => bool) public authorizedCallers; // New: Authorized contracts

    event RewardUsed(address indexed user, uint256 tokenId);
    event RewardReused(address indexed student, uint256 tokenId);
    event RewardMinted(address indexed student, uint256 tokenId);

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

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && to != owner()) {
            require(idNFTContract.balanceOf(to) > 0, "Recipient must own an IdentityNFT");
        }
        return super._update(to, tokenId, auth);
    }
}