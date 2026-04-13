import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebsocketService } from '../../services/websocket';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-translator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './translator.html',
  styleUrl: './translator.css'
})
export class TranslatorComponent implements OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  mode: 'video' | 'text' = 'video';
  isRecording = false;
  currentSign = '';
  confidence = 0;
  bufferPct = 0;
  signHistory: string[] = [];

  private stream: MediaStream | null = null;
  private frameInterval: any = null;
  private sub: Subscription | null = null;

  constructor(private ws: WebsocketService) {}

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoEl.nativeElement.srcObject = this.stream;
      this.isRecording = true;

      this.ws.connect();
      this.sub = this.ws.prediction$.subscribe((data: any) => {
        if (data.sign && data.sign !== 'No Sign' && data.sign !== 'buffering') {
          if (data.sign !== this.currentSign) {
            this.signHistory.push(data.sign);
          }
          this.currentSign = data.sign;
          this.confidence = data.confidence;
        }
        if (data.buffer_pct !== undefined) {
          this.bufferPct = data.buffer_pct;
        }
      });

      // Send a frame every 100ms (10 fps)
      this.frameInterval = setInterval(() => this.sendFrame(), 100);
    } catch (err) {
      console.error('Camera error:', err);
    }
  }

  stopRecording() {
    clearInterval(this.frameInterval);
    this.stream?.getTracks().forEach(t => t.stop());
    this.ws.disconnect();
    this.sub?.unsubscribe();
    this.isRecording = false;
    this.currentSign = '';
    this.confidence = 0;
    this.bufferPct = 0;
  }

  sendFrame() {
    const video = this.videoEl.nativeElement;
    const canvas = this.canvasEl.nativeElement;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, 640, 480);
    canvas.toBlob(blob => {
      if (blob) this.ws.sendFrame(blob);
    }, 'image/jpeg', 0.8);
  }

  ngOnDestroy() {
    this.stopRecording();
  }
}