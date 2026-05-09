declare module 'africastalking' {
  interface AfricasTalkingOptions {
    apiKey: string;
    username: string;
  }

  interface SMSSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SMSSendResult {
    SMSMessageData?: {
      Message: string;
      Recipients: Array<{ statusCode: number; number: string; cost: string; status: string; messageId: string }>;
    };
  }

  interface SMSService {
    send(options: SMSSendOptions): Promise<SMSSendResult>;
  }

  interface AfricasTalkingInstance {
    SMS: SMSService;
  }

  function AfricasTalking(options: AfricasTalkingOptions): AfricasTalkingInstance;
  export = AfricasTalking;
}
