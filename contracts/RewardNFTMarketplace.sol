// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract RewardNFTMarketplace is Ownable {
    IERC721 public rewardNFTContract;
    IERC721 public idNFTContract;
    
    uint256 public nftPrice; // Fixed price set by admin for all NFT trades
    mapping(uint256 => address) public tokenSeller; // Token ID => Seller address

    event NFTPriceSet(uint256 newPrice);
    event NFTListed(uint256 indexed tokenId, address indexed seller);
    event NFTUnlisted(uint256 indexed tokenId, address indexed seller);
    event NFTBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);

    constructor(address _rewardNFTContract, address _idNFTContract) Ownable(msg.sender) {
        require(_rewardNFTContract != address(0), "Invalid RewardNFT contract address");
        require(_idNFTContract != address(0), "Invalid IdentityNFT contract address");
        rewardNFTContract = IERC721(_rewardNFTContract);
        idNFTContract = IERC721(_idNFTContract);
        nftPrice = 0; // Initial price set to 0, admin must update
    }

    // Admin sets the fixed price for all NFT trades
    function setNFTPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be greater than 0");
        nftPrice = _price;
        emit NFTPriceSet(_price);
    }

    // User lists their NFT for sale at the admin-set price
    function listNFT(uint256 _tokenId) external {
        require(nftPrice > 0, "NFT price not set by admin");
        require(rewardNFTContract.ownerOf(_tokenId) == msg.sender, "You do not own this NFT");
        require(idNFTContract.balanceOf(msg.sender) > 0, "Must own an IdentityNFT");
        require(tokenSeller[_tokenId] == address(0), "NFT already listed"); // New check

        // Approve marketplace to transfer the NFT
        require(rewardNFTContract.getApproved(_tokenId) == address(this) || 
                rewardNFTContract.isApprovedForAll(msg.sender, address(this)), 
                "Marketplace not approved");

        tokenSeller[_tokenId] = msg.sender;

        emit NFTListed(_tokenId, msg.sender);
    }

    // User unlists their NFT from sale
    function unlistNFT(uint256 _tokenId) external {
        require(tokenSeller[_tokenId] == msg.sender, "You are not the seller");
        
        delete tokenSeller[_tokenId];

        emit NFTUnlisted(_tokenId, msg.sender);
    }

    // Buy an NFT listed by another user at the admin-set price
    function buyNFT(uint256 _tokenId) external payable {
        address seller = tokenSeller[_tokenId];

        require(nftPrice > 0, "NFT price not set by admin");
        require(seller != address(0), "NFT not listed for sale");
        require(msg.value >= nftPrice, "Insufficient payment");
        require(idNFTContract.balanceOf(msg.sender) > 0, "Must own an IdentityNFT");
        require(seller != msg.sender, "Cannot buy your own NFT");

        // Refund excess payment
        if (msg.value > nftPrice) {
            payable(msg.sender).transfer(msg.value - nftPrice);
        }

        // Clear listing
        delete tokenSeller[_tokenId];

        // Transfer payment to seller
        payable(seller).transfer(nftPrice);

        // Transfer NFT to buyer
        rewardNFTContract.safeTransferFrom(seller, msg.sender, _tokenId);

        emit NFTBought(_tokenId, msg.sender, seller, nftPrice);
    }

    // Get listing details for a token
    function getListing(uint256 _tokenId) external view returns (address seller, uint256 price) {
        return (tokenSeller[_tokenId], nftPrice);
    }

    // Emergency withdrawal of funds by admin
    function withdrawFunds() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Update RewardNFT contract address (if needed)
    function setRewardNFTContract(address _newRewardNFTContract) external onlyOwner {
        require(_newRewardNFTContract != address(0), "Invalid RewardNFT contract address");
        rewardNFTContract = IERC721(_newRewardNFTContract);
    }

    // Update IdentityNFT contract address (if needed)
    function setIdNFTContract(address _newIdNFTContract) external onlyOwner {
        require(_newIdNFTContract != address(0), "Invalid IdentityNFT contract address");
        idNFTContract = IERC721(_newIdNFTContract);
    }
}