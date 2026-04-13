import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private socket: WebSocket | null = null;
  public prediction$ = new Subject<any>();

  connect() {
    this.socket = new WebSocket('ws://localhost:8000/ws/translate');

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.prediction$.next(data);
    };

    this.socket.onerror = (err) => console.error('WebSocket error:', err);
    this.socket.onclose = () => console.log('WebSocket closed');
  }

  sendFrame(blob: Blob) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(blob);
    }
  }

  disconnect() {
    this.socket?.close();
  }
}