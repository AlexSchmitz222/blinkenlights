import { Component, Injectable, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { DateRange, MatDatepickerModule } from '@angular/material/datepicker';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
@Injectable({
  providedIn: 'root'
})

export class BasicDialogService {
  private dialogRef = inject(MatDialog);


  /**
   * Stellt die Möglichkeit, einfache "Ja-Nein" Abfragen darzustellen
   * @param title angezeigter Titel als String
   * @param message angezeigte Meldung als String
   * @returns Observable Objekt das nach folgendem Schema benutzt werden kann:
   * @example
   *   showBooleanDialog('TITEL','MELDUNG').subscribe((result) => {
   *    if (result) {
   *       WENN DER BENUTZER MIT JA GEANTWORTET HAT
   *    }});
   */
  showBooleanDialog(title: string, message: string): Observable<boolean> {
    const dialog = this.dialogRef.open(BooleanDialogComponent, {
      disableClose: true,
      data: {
        title: title,
        message: message,
      },
    });
    return dialog.afterClosed();
  }

  showDatepickerDialog(
    dateRange?: DateRange<Date>
  ): Observable<DateRange<Date>> {
    const dialog = this.dialogRef.open(DatepickerComponent, {
      width: 'auto',
      minWidth: '35%',
      data: {
        dateRange: dateRange,
      },
    });
    return dialog.afterClosed();
  }

  showTextareaDialog(title: string): Observable<string | null> {
    const dialog = this.dialogRef.open(TextareaDialogComponent, {
      disableClose: true,
      width: 'auto',
      data: {
        title: title,
      },
    });
    return dialog.afterClosed();
  }

  showInputDialog(title: string, type: HTMLInputElement['type']): Observable<string | null> {
    const dialog = this.dialogRef.open(InputDialogComponent, {
      disableClose: true,
      width: 'auto',
      data: {
        title: title,
        type: type,
      },
    });
    return dialog.afterClosed();
  }

}

//---BOOLEAN DIALOG---
@Component({
  selector: 'app-boolean-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>

    <mat-dialog-content>
      {{ data.message }}
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button class="no" mat-stroked-button (click)="no()">
        Nein
      </button>
      <button class="yes" mat-stroked-button (click)="yes()">
        Ja
      </button>
    </mat-dialog-actions>
  `,
})

export class BooleanDialogComponent {
  private dialogRef = inject<MatDialogRef<BooleanDialogComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  hasAccepted: boolean = false;

  yes() {
    this.hasAccepted = true;
    this.dialogRef.close(this.hasAccepted);
  }

  no() {
    this.hasAccepted = false;
    this.dialogRef.close(this.hasAccepted);
  }
}



//---DATEPICKER DIALOG---
@Component({
  selector: 'app-datepicker-dialog',
  imports: [MatDialogModule, MatDatepickerModule, MatCardModule, MatButtonModule],
  template: `
    <h1 mat-dialog-title>Datum auswählen:</h1>
    <mat-dialog-content>
      <mat-card>
        <mat-calendar
          [selected]="selectedRangeValue"
          (selectedChange)="selectedChange($event)"
        >
        </mat-calendar>
      </mat-card>
      <br />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="close()">
        Ok
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class DatepickerComponent {
  private dialogRef = inject<MatDialogRef<DatepickerComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  ngOnInit() {
    if (this.data.dateRange != undefined) {
      this.selectedRangeValue = this.data.dateRange;
    }
  }
  @Input() selectedRangeValue: DateRange<Date> | undefined;
  @Output() selectedRangeValueChange = new EventEmitter<DateRange<Date>>();

  selectedChange(m: any) {
    if (!this.selectedRangeValue?.start || this.selectedRangeValue?.end) {
      this.selectedRangeValue = new DateRange<Date>(m, null);
    } else {
      const start = this.selectedRangeValue.start;
      const end = m;
      if (end == start) {
        this.selectedRangeValue = new DateRange<Date>(start, null);
      } else {
        if (end < start) {
          this.selectedRangeValue = new DateRange<Date>(end, start);
        } else {
          this.selectedRangeValue = new DateRange<Date>(start, end);
        }
      }
    }
    this.selectedRangeValueChange.emit(this.selectedRangeValue);
  } //Code geklaut bei hier: https://stackoverflow.com/questions/67484281/how-to-implement-ranged-inline-calendar-with-angular-material <-- Für Olli auch voll nett auf Deutsch :D

  close() {
    console.log(this.selectedRangeValue)
    this.dialogRef.close(this.selectedRangeValue);
  }
}



//---TEXTAREA DIALOG---
@Component({
  imports: [MatDialogModule, FormsModule, MatFormFieldModule, ReactiveFormsModule, MatButtonModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>

    <mat-dialog-content [formGroup]="textareaDialog">
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Notiz</mat-label>
        <textarea matInput formControlName="textarea"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button class="no" mat-stroked-button (click)="abort()" tabIndex="0">
        Abbrechen
      </button>
      <button class="yes" mat-stroked-button (click)="save()" tabIndex="1">
        Ok
      </button>
    </mat-dialog-actions>
  `,
})
export class TextareaDialogComponent {
  private dialogRef = inject<MatDialogRef<TextareaDialogComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  textareaDialog: FormGroup;
  constructor() {
    this.textareaDialog = new FormGroup({
      textarea: new FormControl('', Validators.required),
    });
  }

  save() {
    if (this.textareaDialog.valid) {
      this.dialogRef.close(this.textareaDialog.value.textarea);
    } else {
      this.textareaDialog.markAllAsTouched();
    }
  }

  abort() {
    this.dialogRef.close(null);
  }
}

//---INPUT DIALOG---
@Component({
  imports: [MatDialogModule, FormsModule, MatFormFieldModule, ReactiveFormsModule, MatButtonModule, MatInputModule],
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    
    <mat-dialog-content [formGroup]="inputDialog">
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Eingabe</mat-label>
        <input matInput [type]="data.type" formControlName="input" class="mat-input-element">
        @if (inputDialog.get('input')?.hasError('required')) {
          <mat-error>
            Eingabe erforderlich
          </mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button class="no" mat-stroked-button (click)="abort()" tabIndex="0">
        Abbrechen
      </button>
      <button class="yes" mat-stroked-button (click)="save()" tabIndex="1">
        Ok
      </button>
    </mat-dialog-actions>
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    :host {
      display: block;
    }
    .mat-form-field {
      width: 100%;
    }
  `]
})
export class InputDialogComponent {
  private dialogRef = inject<MatDialogRef<InputDialogComponent>>(MatDialogRef);
  data = inject(MAT_DIALOG_DATA);

  inputDialog: FormGroup;
  constructor() {
    this.inputDialog = new FormGroup({
      input: new FormControl('', Validators.required),
    });
  }

  save() {
    if (this.inputDialog.valid) {
      this.dialogRef.close(this.inputDialog.value.input);
    } else {
      this.inputDialog.markAllAsTouched();
    }
  }

  abort() {
    this.dialogRef.close(null);
  }
}