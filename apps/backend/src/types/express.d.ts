declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
        phone: string | null;
        status: string;
        roles: string[];
        sessionId?: string;
      };
      requestId?: string;
    }
  }
}

export {};
