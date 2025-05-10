import { ethers } from 'ethers';
import { getContractInstance, getProvider } from '../utils/blockchain';
import { config } from '../config';
// import { prisma } from '../models/prisma';
// import { AttendanceRecord } from '@d-attend/common/types/attendance';

const AttendanceRecordABI = [
  "function createRecord(address user, bytes32 proofHash, uint256 checkInTime) external returns (uint256)",
  "function completeRecord(uint256 recordId, uint256 checkOutTime) external",
  "function getRecord(uint256 recordId) external view returns (address user, bytes32 proofHash, uint256 checkInTime, uint256 checkOutTime, uint8 status)"
];

export class AttendanceService {
  /**
   * Create an attendance record on the blockchain
   */
  static async createAttendanceRecord(userAddress: string, proofHash: string, checkInTime: number) {
    try {
      const provider = getProvider();
      const privateKey = process.env.OPERATOR_PRIVATE_KEY || '';
      const wallet = new ethers.Wallet(privateKey, provider);

      // Get contract using provider, then connect signer
      const contract = getContractInstance(
        config.blockchain.contractAddress,
        AttendanceRecordABI,
        provider
      );
      const contractWithSigner = contract.connect(wallet);

      const tx = await contractWithSigner.createRecord(
        userAddress,
        proofHash,
        checkInTime
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error creating attendance record on blockchain:', error);
      throw error;
    }
  }

  /**
   * Complete an attendance record on the blockchain
   */
  static async completeAttendanceRecord(recordId: number, checkOutTime: number) {
    try {
      const provider = getProvider();
      const privateKey = process.env.OPERATOR_PRIVATE_KEY || '';
      const wallet = new ethers.Wallet(privateKey, provider);

      const contract = getContractInstance(
        config.blockchain.contractAddress,
        AttendanceRecordABI,
        provider
      );
      const contractWithSigner = contract.connect(wallet);

      const tx = await contractWithSigner.completeRecord(recordId, checkOutTime);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error completing attendance record on blockchain:', error);
      throw error;
    }
  }

  /**
   * Verify an attendance record from the blockchain
   */
  static async verifyAttendanceRecord(recordId: number) {
    try {
      const provider = getProvider();
      const contract = getContractInstance(
        config.blockchain.contractAddress,
        AttendanceRecordABI,
        provider
      );

      const record = await contract.getRecord(recordId);
      return {
        user: record.user,
        proofHash: record.proofHash,
        checkInTime: record.checkInTime.toNumber(),
        checkOutTime: record.checkOutTime.toNumber(),
        status: record.status
      };
    } catch (error) {
      console.error('Error verifying attendance record on blockchain:', error);
      throw error;
    }
  }
}
