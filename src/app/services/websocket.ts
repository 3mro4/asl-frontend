import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private socket: WebSocket | null = null;
  public prediction$ = new Subject<any>();
  public status$ = new Subject<'connecting' | 'open' | 'error' | 'closed'>();

  connect() {
    this.status$.next('connecting');
    this.socket = new WebSocket('ws://localhost:8000/ws/translate');

    this.socket.onopen = () => this.status$.next('open');

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.prediction$.next(data);
    };

    this.socket.onerror = () => this.status$.next('error');
    this.socket.onclose = () => this.status$.next('closed');
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