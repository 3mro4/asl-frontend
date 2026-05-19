import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private socket: WebSocket | null = null;
  public prediction$ = new Subject<any>();
  public status$     = new Subject<'connecting' | 'open' | 'error' | 'closed'>();
  private waiting    = false;

  connect() {
    this.waiting = false;
    this.status$.next('connecting');
    this.socket = new WebSocket('ws://localhost:8000/ws/translate');

    this.socket.onopen = () => this.status$.next('open');

    this.socket.onmessage = (event) => {
      this.waiting = false;
      const data = JSON.parse(event.data);
      this.prediction$.next(data);
    };

    this.socket.onerror = () => this.status$.next('error');
    this.socket.onclose = () => this.status$.next('closed');
  }

  sendFrame(blob: Blob) {
    if (this.socket?.readyState === WebSocket.OPEN && !this.waiting) {
      this.waiting = true;
      this.socket.send(blob);
    }
  }

  disconnect() {
    this.socket?.close();
    this.waiting = false;
  }
}