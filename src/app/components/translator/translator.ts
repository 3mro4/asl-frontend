import {
  Component, ElementRef, ViewChild, OnDestroy, AfterViewInit,
  ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from '../../services/websocket';
import { SignPoseService, PoseToken } from '../../services/sign-pose.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-translator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './translator.html',
  styleUrl: './translator.css',
})
export class TranslatorComponent implements OnDestroy, AfterViewInit {
  @ViewChild('videoEl')    videoEl!:      ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl')   canvasEl!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('poseViewer') poseViewerEl?: ElementRef<HTMLElement>;

  mode: 'video' | 'text' = 'video';

  // ── Video → Text ───────────────────────────────────────
  isRecording    = false;
  cameraError    = '';
  wsStatus: 'connecting' | 'open' | 'error' | 'closed' | '' = '';
  bufferPct      = 0;
  currentSign    = '';
  confidence     = 0;
  signHistory:   string[] = [];
  cameras:       MediaDeviceInfo[] = [];
  selectedCamera = '';
  private stream:        MediaStream | null = null;
  private frameInterval: any               = null;
  private sub:           Subscription | null = null;

  // ── Text → Sign ────────────────────────────────────────
  textInput         = '';
  poseQueue:        PoseToken[] = [];
  currentPoseIdx    = 0;
  currentPoseUrl    = '';
  poseIsPlaying     = false;
  dictEntries:      any[] = [];
  dictSearch        = '';

  constructor(
    private ws:              WebsocketService,
    private cdr:             ChangeDetectorRef,
    private signPoseService: SignPoseService,
  ) {
    this.buildDictEntries();
  }

  ngAfterViewInit() {
    this.signPoseService.loadManifest().then(() => {
      this.buildDictEntries(this.dictSearch);
      this.cdr.detectChanges();
    });
    this.loadCameras();
  }

  async loadCameras() {
    try {
      // Brief permission request so labels are populated
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach(t => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter(d => d.kind === 'videoinput');
      if (this.cameras.length > 0) this.selectedCamera = this.cameras[0].deviceId;
      this.cdr.detectChanges();
    } catch {
      // Permission denied or no cameras — dropdown stays hidden
    }
  }

  // ── Mode ───────────────────────────────────────────────
  setMode(m: 'video' | 'text') { this.mode = m; }

  // ── Video → Text ───────────────────────────────────────
  async toggleRecording() {
    this.isRecording ? this.stopRecording() : await this.startRecording();
  }

  async startRecording() {
    this.cameraError = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError = 'Camera API not available. Make sure the page is served over localhost or HTTPS.';
      return;
    }
    try {
      const videoConstraint = this.selectedCamera
        ? { deviceId: { exact: this.selectedCamera } }
        : true;
      this.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint });
      this.isRecording = true;
      this.cdr.detectChanges();
      const video = this.videoEl.nativeElement;
      video.srcObject = this.stream;
      video.play().catch(() => {});
      this.ws.connect();
      this.ws.status$.subscribe(s => { this.wsStatus = s; this.cdr.detectChanges(); });
      this.sub = this.ws.prediction$.subscribe((data: any) => {
        if (data.sign && data.sign !== 'No Sign' && data.sign !== 'buffering') {
          if (data.sign !== this.currentSign) this.signHistory.push(data.sign);
          this.currentSign = data.sign;
          this.confidence  = data.confidence;
        }
        if (data.buffer_pct !== undefined) this.bufferPct = data.buffer_pct;
        this.cdr.detectChanges();
      });
      this.frameInterval = setInterval(() => this.sendFrame(), 100);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        this.cameraError = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError') {
        this.cameraError = 'No camera found. Please connect a camera and try again.';
      } else {
        this.cameraError = `Camera error: ${err.message}`;
      }
    }
  }

  stopRecording() {
    clearInterval(this.frameInterval);
    this.stream?.getTracks().forEach(t => t.stop());
    this.ws.disconnect();
    this.sub?.unsubscribe();
    this.isRecording = false;
    this.wsStatus    = '';
    this.bufferPct   = 0;
    this.currentSign = '';
    this.confidence  = 0;
  }

  sendFrame() {
    const video  = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = 320; canvas.height = 240;
    canvas.getContext('2d')!.drawImage(video, 0, 0, 320, 240);
    canvas.toBlob(blob => { if (blob) this.ws.sendFrame(blob); }, 'image/jpeg', 0.6);
  }

  // ── Text → Sign ────────────────────────────────────────
  async translate() {
    if (!this.textInput.trim()) return;
    await this.signPoseService.loadManifest();

    this.poseQueue      = this.signPoseService.tokenize(this.textInput);
    this.currentPoseIdx = 0;
    this.currentPoseUrl = '';
    this.poseIsPlaying  = false;
    this.cdr.detectChanges();

    this.advanceToNextAvailable();
    this.buildDictEntries(this.dictSearch);
  }

  clearText() {
    this.textInput      = '';
    this.poseQueue      = [];
    this.currentPoseIdx = 0;
    this.currentPoseUrl = '';
    this.poseIsPlaying  = false;
  }

  useExample(ex: string) { this.textInput = ex; this.translate(); }

  onPoseEnded() {
    this.currentPoseIdx++;
    this.advanceToNextAvailable();
  }

  attachPoseListener() {
    const el = this.poseViewerEl?.nativeElement;
    if (!el) return;
    el.removeEventListener('ended$', this._poseEndedCb);
    el.removeEventListener('ended',  this._poseEndedCb);
    el.addEventListener('ended$', this._poseEndedCb);
    el.addEventListener('ended',  this._poseEndedCb);
  }

  private _poseEndedCb = () => {
    this.currentPoseIdx++;
    this.advanceToNextAvailable();
    this.cdr.detectChanges();
  };

  private advanceToNextAvailable() {
    while (
      this.currentPoseIdx < this.poseQueue.length &&
      !this.poseQueue[this.currentPoseIdx].poseUrl
    ) {
      this.currentPoseIdx++;
    }
    if (this.currentPoseIdx >= this.poseQueue.length) {
      this.currentPoseUrl = '';
      this.poseIsPlaying  = false;
      this.cdr.detectChanges();
      return;
    }
    this.currentPoseUrl = this.poseQueue[this.currentPoseIdx].poseUrl!;
    this.poseIsPlaying  = true;
    this.cdr.detectChanges();
  }

  get nowSigningWord(): string {
    return this.poseQueue[this.currentPoseIdx]?.word ?? '—';
  }

  get availableCount(): number {
    return this.poseQueue.filter(t => t.poseUrl).length;
  }

  get missingCount(): number {
    return this.poseQueue.filter(t => !t.poseUrl).length;
  }

  togglePosePlayback() {
    const el = this.poseViewerEl?.nativeElement as any;
    if (!el) return;
    if (this.poseIsPlaying) {
      el.pause?.();
      this.poseIsPlaying = false;
    } else {
      if (!this.currentPoseUrl && this.poseQueue.length) {
        this.currentPoseIdx = 0;
        this.advanceToNextAvailable();
      } else {
        el.play?.();
        this.poseIsPlaying = true;
      }
    }
  }

  jumpToPoseWord(idx: number) {
    this.currentPoseIdx = idx;
    if (this.poseQueue[idx]?.poseUrl) {
      this.currentPoseUrl = this.poseQueue[idx].poseUrl!;
      this.poseIsPlaying  = true;
    } else {
      this.advanceToNextAvailable();
    }
    this.cdr.detectChanges();
  }

  buildDictEntries(search = '') {
    const vocab = this.signPoseService.getVocabulary();
    this.dictEntries = vocab
      .filter(({ name }) => !search || name.toLowerCase().includes(search.toLowerCase()))
      .map(({ name, available }) => ({
        name,
        cat: available ? 'pose ready' : 'unavailable',
        available,
      }))
      .sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  onDictSearch(val: string) { this.dictSearch = val; this.buildDictEntries(val); }

  clickDictWord(name: string) {
    this.textInput = name;
    this.translate();
    this.setMode('text');
  }

  get examples() {
    return ['hello', 'thank you', 'dog cat bird', 'happy sad', 'mom dad'];
  }

  ngOnDestroy() {
    this.stopRecording();
  }
}
