import {
  Component,
  OnInit,
  AfterViewInit,
  Input,
  Output,
  ViewEncapsulation,
  ContentChild,
  TemplateRef,
  ViewChild,
  EventEmitter,
} from '@angular/core';

import { DroppableDirective, DraggableDirective } from '../../directives';

let i = 0;
function getNextId() {
  return i++;
}

/**
 * Component that allows nested ngxDroppable and ngxDraggables
 * 
 * @export
 * @class ContainerComponent
 * @implements {OnInit}
 * @implements {AfterViewInit}
 */
@Component({
  selector: 'ngx-dnd-container',
  templateUrl: 'container.component.html',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./container.component.scss'],
})
export class ContainerComponent implements OnInit, AfterViewInit {
  @Input() model: any;
  @Input() copy = false;
  @Input() removeOnSpill = false;
  @Input() droppableItemClass: string | ((o: any) => any);

  @Input() dropZone = `@@DefaultDropZone-${getNextId()}@@`;

  @Input()
  get dropZones() {
    return this._dropZones || this._defaultZones;
  }
  set dropZones(val) {
    this._dropZones = val;
  }

  // @Input() classes: any = {};
  // @Input() dragulaOptions: any;

  @Input()
  @ContentChild(TemplateRef) 
  template: TemplateRef<any>;

  @Input()
  @ViewChild(DroppableDirective) 
  droppable: any;

  @Output()
  drop: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  drag: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  dragend: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  dragging: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  over: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  out: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  remove: EventEmitter<any> = new EventEmitter<any>();

  @Output()
  cancel: EventEmitter<any> = new EventEmitter<any>();

  _dropZones: string[];
  _defaultZones: string[];

  ngOnInit() {
    this._defaultZones = [this.dropZone];
  }

  ngAfterViewInit() {
    this.droppable.drag.subscribe(v => this.drag.emit(v));
    this.droppable.drop.subscribe(v => this.drop.emit(v));
    this.droppable.over.subscribe(v => this.over.emit(v));
    this.droppable.out.subscribe(v => this.out.emit(v));
    this.droppable.remove.subscribe(v => this.remove.emit(v));
    this.droppable.cancel.subscribe(v => this.cancel.emit(v));
    this.droppable.dragend.subscribe(v => this.dragend.emit(v));
    this.droppable.dragging.subscribe(v => this.dragging.emit(v));
  }
}
