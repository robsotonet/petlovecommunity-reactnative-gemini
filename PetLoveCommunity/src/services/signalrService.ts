import * as signalR from '@microsoft/signalr';

const HUB_URL = 'https://petlovecommunity.com/hub';

class SignalRService {
  private connection: signalR.HubConnection;

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    // Start the connection
    this.connection.start().catch(err => console.error('SignalR Connection Error: ', err));

    // TODO: Add logic for handling background state

    this.connection.on('auth:session-terminated', () => {
      // In a real app, you would handle session termination here
      // For example, by logging the user out
      console.log('Session terminated by server');
    });
  }

  public getConnection(): signalR.HubConnection {
    return this.connection;
  }
}

const signalRService = new SignalRService();
export default signalRService;
