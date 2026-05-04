import { Component, ElementRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from '../../services/websocket';
import { Subscription } from 'rxjs';
import {
  buildSequenceFromText, drawSkeleton, lerpPose, ease,
  RESTING_POSE, SIGN_DICT
} from './sign-animator';
import { SafeHtmlPipe } from './safe-html.pipe';

@Component({
  selector: 'app-translator',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeHtmlPipe],
  templateUrl: './translator.html',
  styleUrl: './translator.css'
})
export class TranslatorComponent implements OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  mode: 'video' | 'text' = 'video';

  // ── Video → Text state ──────────────────────────────
  isRecording = false;
  currentSign = '';
  confidence = 0;
  bufferPct = 0;
  signHistory: string[] = [];
  private stream: MediaStream | null = null;
  private frameInterval: any = null;
  private sub: Subscription | null = null;

  // ── Text → Sign state ───────────────────────────────
  textInput = '';
  figureHtml = '';
  nowSigning = '—';
  signDesc = '';
  modeTag = 'IDLE';
  modeTagClass = 'stage-tag idle';
  indexTag = '— / —';
  progressPct = 0;
  timeNow = '0.0s';
  timeTotal = '0.0s';
  animSpeed = 1;
  queue: any[] = [];
  tokens: any[] = [];
  dictEntries: any[] = [];
  dictSearch = '';
  showBreakdown = false;

animPlaying = false;
  private animIdx = 0;
  private animFrameIdx = 0;
  private animT = 0;
  private animLastTs = 0;
  private animRafId: any = null;

  constructor(private ws: WebsocketService, private cdr: ChangeDetectorRef) {
    this.figureHtml = drawSkeleton(RESTING_POSE);
    this.buildDictEntries();
  }

  // ── Mode switch ──────────────────────────────────────
  setMode(m: 'video' | 'text') {
    this.mode = m;
    if (m === 'text') this.figureHtml = drawSkeleton(RESTING_POSE);
  }

  // ── Video → Text ─────────────────────────────────────
  async toggleRecording() {
    this.isRecording ? this.stopRecording() : await this.startRecording();
  }

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoEl.nativeElement.srcObject = this.stream;
      this.isRecording = true;
      this.ws.connect();
      this.sub = this.ws.prediction$.subscribe((data: any) => {
        if (data.sign && data.sign !== 'No Sign' && data.sign !== 'buffering') {
          if (data.sign !== this.currentSign) this.signHistory.push(data.sign);
          this.currentSign = data.sign;
          this.confidence = data.confidence;
        }
        if (data.buffer_pct !== undefined) this.bufferPct = data.buffer_pct;
        this.cdr.detectChanges();
      });
      this.frameInterval = setInterval(() => this.sendFrame(), 300);
    } catch (err) { console.error('Camera error:', err); }
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
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = 640; canvas.height = 480;
    canvas.getContext('2d')!.drawImage(video, 0, 0, 640, 480);
    canvas.toBlob(blob => { if (blob) this.ws.sendFrame(blob); }, 'image/jpeg', 0.8);
  }

  // ── Text → Sign ──────────────────────────────────────
  translate() {
    if (!this.textInput.trim()) return;
    this.queue = buildSequenceFromText(this.textInput);
    this.animIdx = 0; this.animFrameIdx = 0; this.animT = 0;
    this.buildTokens();
    this.showBreakdown = this.queue.length > 0;
    if (this.queue.length) this.startAnim();
  }

  clearText() {
    this.textInput = '';
    this.queue = [];
    this.tokens = [];
    this.showBreakdown = false;
    this.pauseAnim();
    this.animIdx = 0; this.animFrameIdx = 0; this.animT = 0;
    this.figureHtml = drawSkeleton(RESTING_POSE);
    this.updateAnimUI();
  }

  useExample(ex: string) {
    this.textInput = ex;
    this.translate();
  }

  setSpeed(s: number) { this.animSpeed = s; }

  toggleAnim() {
    if (!this.queue.length) return;
    if (this.animPlaying) { this.pauseAnim(); }
    else {
      if (this.animIdx >= this.queue.length) { this.animIdx=0; this.animFrameIdx=0; this.animT=0; }
      this.startAnim();
    }
  }

  jumpTo(idx: number) {
    this.animIdx = idx; this.animFrameIdx = 0; this.animT = 0;
    if (!this.animPlaying) this.startAnim();
    this.updateAnimUI();
    this.cdr.detectChanges();
  }

  private startAnim() {
    this.animPlaying = true;
    this.animLastTs = performance.now();
    if (this.animRafId) cancelAnimationFrame(this.animRafId);
    this.animRafId = requestAnimationFrame((ts) => this.animStep(ts));
  }

  private pauseAnim() { this.animPlaying = false; }

  private animStep(now: number) {
    if (!this.animPlaying) return;
    const dt = (now - this.animLastTs) / 1000;
    this.animLastTs = now;
    const item = this.queue[this.animIdx];
    if (!item) {
      this.pauseAnim();
      this.animIdx = 0; this.animFrameIdx = 0; this.animT = 0;
      this.figureHtml = drawSkeleton(RESTING_POSE);
      this.updateAnimUI();
      this.cdr.detectChanges();
      return;
    }
    const baseDur = item.kind==='space'?0.35:item.kind==='spell-start'?0.28:item.kind==='letter'?0.35:0.45;
    const dur = baseDur / this.animSpeed;
    this.animT += dt / dur;
    if (this.animT >= 1) {
      this.animT = 0; this.animFrameIdx++;
      if (this.animFrameIdx >= item.frames.length - 1) {
        this.animIdx++; this.animFrameIdx = 0;
      }
      this.updateAnimUI();
    }
    const newItem = this.queue[this.animIdx];
    if (newItem) {
      const a = newItem.frames[this.animFrameIdx];
      const b = newItem.frames[this.animFrameIdx+1]||a;
      this.figureHtml = drawSkeleton(lerpPose(a, b, ease(this.animT)));
      this.updateProgress();
    }
    this.cdr.detectChanges();
    if (this.animPlaying) this.animRafId = requestAnimationFrame((ts) => this.animStep(ts));
  }

  private updateAnimUI() {
    const item = this.queue[this.animIdx];
    if (!item) {
      this.modeTag = this.queue.length ? 'DONE' : 'IDLE';
      this.modeTagClass = 'stage-tag idle';
      this.indexTag = this.queue.length ? `${this.queue.length}/${this.queue.length}` : '—/—';
      this.nowSigning = '—'; this.signDesc = '';
    } else if (item.kind==='space') {
      this.modeTag = 'PAUSE'; this.modeTagClass = 'stage-tag idle';
      this.nowSigning = '·'; this.signDesc = '';
    } else if (item.kind==='letter'||item.kind==='spell-start') {
      this.modeTag = 'FINGERSPELLING'; this.modeTagClass = 'stage-tag spelling';
      this.nowSigning = item.label; this.signDesc = item.desc;
    } else {
      this.modeTag = 'SIGN'; this.modeTagClass = 'stage-tag signing';
      this.nowSigning = item.label; this.signDesc = item.desc||'';
    }
    this.indexTag = `${this.animIdx+1}/${this.queue.length}`;
    this.tokens = this.tokens.map((t,i) => ({...t, active: i===this.animIdx}));
  }

  private updateProgress() {
    let elapsed = 0, total = 0;
    for (let i=0;i<this.queue.length;i++) {
      const it = this.queue[i];
      const bd = it.kind==='space'?0.35:it.kind==='spell-start'?0.28:it.kind==='letter'?0.35:0.45;
      const d = bd*(it.frames.length-1)/this.animSpeed;
      total += d;
      if (i<this.animIdx) elapsed += d;
      else if (i===this.animIdx) elapsed += bd*(this.animFrameIdx+this.animT)/this.animSpeed;
    }
    this.progressPct = total>0 ? Math.min(100, elapsed/total*100) : 0;
    this.timeNow = elapsed.toFixed(1)+'s';
    this.timeTotal = total.toFixed(1)+'s';
  }

  private buildTokens() {
    this.tokens = this.queue
      .filter(it => it.kind!=='space'&&it.kind!=='spell-end')
      .map((it,i) => ({...it, queueIdx: i, active: false}));
  }

  buildDictEntries(search='') {
    this.dictEntries = Object.entries(SIGN_DICT)
      .filter(([name]) => !search || name.toLowerCase().includes(search.toLowerCase()))
      .map(([name, def]: any) => ({name, cat: def.cat}))
      .sort((a,b) => a.name.localeCompare(b.name));
  }

  onDictSearch(val: string) { this.buildDictEntries(val); }

  clickDictWord(name: string) {
    this.textInput = name;
    this.translate();
    this.setMode('text');
  }

  get examples() {
    return ['Hello my name is Omar','Thank you','I love you','How are you today','I want to eat'];
  }

  ngOnDestroy() {
    this.stopRecording();
    this.pauseAnim();
  }
}