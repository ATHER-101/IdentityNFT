// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract IdentityNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private nextTokenId = 1; // Counter for unique token IDs
    mapping(uint256 => string) public roles; // e.g., "student"
    mapping(uint256 => bool) public isActive; // Active or inactive status

    // Constructor: Initialize ERC721 with name and symbol, and set the initial owner
    constructor() ERC721("IdentityNFT", "IDNFT") Ownable(msg.sender) {}

    // Mint a new NFT (only admin)
    function mintIdentity(address to, string memory role, string memory uri) public onlyOwner {
        require(balanceOf(to) == 0, "Recipient already has a token");
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri); // Links to IPFS metadata
        roles[tokenId] = role;
        isActive[tokenId] = true;
    }

    // Update role (only admin)
    function setRole(uint256 tokenId, string memory newRole) public onlyOwner {
        roles[tokenId] = newRole;
    }

    // Update active status (only admin)
    function setActive(uint256 tokenId, bool active) public onlyOwner {
        isActive[tokenId] = active;
    }

    // Update metadata URI (only admin)
    function setTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
        _setTokenURI(tokenId, uri);
    }

    // Burn an NFT (only admin)
    function burn(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
        delete roles[tokenId];
        delete isActive[tokenId];
    }

    // Override _update to enforce soulbound logic
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Tokens are soulbound and cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }

    // Override _increaseBalance to resolve the conflict
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    // Override supportsInterface for multiple inheritance
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Override tokenURI for ERC721URIStorage
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}