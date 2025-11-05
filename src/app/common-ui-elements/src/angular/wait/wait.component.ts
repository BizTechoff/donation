import { Component, OnInit } from '@angular/core'
import { ProgressSpinnerMode } from '@angular/material/progress-spinner'
import { DialogConfig } from '../DialogConfig'

@DialogConfig({
  maxWidth: '10vw',
  width: '80px',
  maxHeight: '10vh',
  panelClass: 'data-area-dialog',
})
@Component({
  selector: 'app-wait',
  templateUrl: './wait.component.html',
  styleUrls: ['./wait.component.scss'],
})
export class WaitComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
  mode: ProgressSpinnerMode = 'indeterminate'
  value = 0
}
