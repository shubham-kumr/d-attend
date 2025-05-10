import { ethers } from 'ethers';
import { getContractInstance, getProvider } from '../utils/blockchain';
import { config } from '../config';

// Smart contract ABI
const CredentialNFTABI = [
  "function mintCredential(address to, string memory uri, string memory credentialType, uint256 expiryTime) external returns (uint256)",
  "function revokeCredential(uint256 tokenId) external",
  "function getCredential(uint256 tokenId) external view returns (address owner, string memory uri, string memory credentialType, uint256 issuedAt, uint256 expiryTime, bool revoked)",
  "function isValid(uint256 tokenId) external view returns (bool)"
];

export class CredentialService {
  /**
   * Issue a credential on the blockchain
   */
  static async issueCredential(
    recipientAddress: string,
    metadataUri: string,
    credentialType: string,
    expiryTime: number = 0
  ) {
    try {
      const provider = getProvider();
      const privateKey = process.env.OPERATOR_PRIVATE_KEY || '';
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = getContractInstance(
        config.blockchain.contractAddress,
        CredentialNFTABI,
        provider
      );

      const contractWithSigner = contract.connect(wallet);

      const tx = await contractWithSigner.mintCredential(
        recipientAddress,
        metadataUri,
        credentialType,
        expiryTime
      );

      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error issuing credential on blockchain:', error);
      throw error;
    }
  }

  /**
   * Revoke a credential on the blockchain
   */
  static async revokeCredential(tokenId: number) {
    try {
      const provider = getProvider();
      const privateKey = process.env.OPERATOR_PRIVATE_KEY || '';
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = getContractInstance(
        config.blockchain.contractAddress,
        CredentialNFTABI,
        provider
      );

      const contractWithSigner = contract.connect(wallet);

      const tx = await contractWithSigner.revokeCredential(tokenId);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error revoking credential on blockchain:', error);
      throw error;
    }
  }

  /**
   * Get credential details from the blockchain
   */
  static async getCredential(tokenId: number) {
    try {
      const provider = getProvider();
      const contract = getContractInstance(
        config.blockchain.contractAddress,
        CredentialNFTABI,
        provider
      );

      const credential = await contract.getCredential(tokenId);
      return {
        owner: credential.owner,
        uri: credential.uri,
        credentialType: credential.credentialType,
        issuedAt: credential.issuedAt.toNumber(),
        expiryTime: credential.expiryTime.toNumber(),
        revoked: credential.revoked
      };
    } catch (error) {
      console.error('Error getting credential from blockchain:', error);
      throw error;
    }
  }

  /**
   * Verify if a credential is valid on the blockchain
   */
  static async verifyCredential(tokenId: number) {
    try {
      const provider = getProvider();
      const contract = getContractInstance(
        config.blockchain.contractAddress,
        CredentialNFTABI,
        provider
      );

      const isValid = await contract.isValid(tokenId);
      return isValid;
    } catch (error) {
      console.error('Error verifying credential on blockchain:', error);
      throw error;
    }
  }
}
