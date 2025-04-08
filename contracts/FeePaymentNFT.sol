// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FeePaymentNFT is ERC721URIStorage, Ownable {
    address public collegeTreasury;
    uint256 public tokenCounter;

    IERC721 public idNFTContract;

    mapping(address => uint256) public activeFeeNFT;

    event FeePaid(address indexed student, uint256 tokenId, uint256 amount, string semester);

    constructor(address _collegeTreasury, address _idNFTContract) 
        ERC721("SemesterFeeNFT", "SFNFT") 
        Ownable(msg.sender)
    {
        require(_collegeTreasury != address(0), "Invalid treasury address");
        require(_idNFTContract != address(0), "Invalid ID NFT contract");

        collegeTreasury = _collegeTreasury;
        idNFTContract = IERC721(_idNFTContract);
        tokenCounter = 1;
    }

    function payFee(
        string memory semester,
        string memory metadataURI
    ) public payable {
        require(idNFTContract.balanceOf(msg.sender) > 0, "You must own a valid ID NFT to pay fees");
        require(msg.value > 0, "Fee must be greater than 0");

        (bool sent, ) = collegeTreasury.call{value: msg.value}("");
        require(sent, "Payment transfer failed");

        if (activeFeeNFT[msg.sender] != 0) {
            _burn(activeFeeNFT[msg.sender]);
        }

        uint256 newTokenId = tokenCounter;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        activeFeeNFT[msg.sender] = newTokenId;
        tokenCounter++;

        emit FeePaid(msg.sender, newTokenId, msg.value, semester);
    }

    function verifyFeePaid(address student) external view returns (bool) {
        return activeFeeNFT[student] != 0;
    }

    // 🔒 Soulbound logic: Prevent transfers
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Semester Fee NFTs are soulbound and cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }
}