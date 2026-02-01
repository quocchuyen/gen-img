import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-queue-progress',
  templateUrl: './queue-progress.component.html',
  imports: [CommonModule],
})
export class QueueProgressComponent {
  total = input.required<number>();
  completed = input.required<number>();
  current = input.required<number>();

  progressPercentage = computed(() => {
    const total = this.total();
    if (total === 0) return 0;
    return (this.completed() / total) * 100;
  });
}
