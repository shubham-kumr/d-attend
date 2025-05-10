export interface Credential {
  tokenId: string;
  owner: string;
  uri: string;
  credentialType: string;
  issuedAt: number;
  expiryTime?: number;
  revoked: boolean;
}