export interface AttendanceRecord {
  id: string;
  userId: string;
  sessionId: string;
  checkInTime: number;
  checkOutTime?: number;
  proofHash: string;
  status: 'PENDING' | 'COMPLETED' | 'INVALID';
}