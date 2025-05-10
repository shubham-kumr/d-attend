import { ethers } from 'ethers';
import { config } from '../config';

// Create ethers provider
export const getProvider = () => {
  return new ethers.providers.JsonRpcProvider(config.blockchain.rpcUrl);
};

// Get contract instance using ABI, address, and signer/provider
export const getContractInstance = (
  contractAddress: string,
  contractABI: any,
  signerOrProvider = getProvider()
) => {
  return new ethers.Contract(contractAddress, contractABI, signerOrProvider);
};

// Sign message with private key
export const signMessage = async (message: string, privateKey: string) => {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(message);
  return signature;
};

// Verify signature
export const verifySignature = (message: string, signature: string) => {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return null;
  }
};