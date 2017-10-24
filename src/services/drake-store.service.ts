import { Injectable, EventEmitter, Renderer, NgZone } from '@angular/core';

import * as dragula from 'dragula';
import { DroppableDirective } from '../directives/ngx-droppable.directive';
import { DraggableDirective } from '../directives/ngx-draggable.directive';

/**
 * Central service that handles all events
 * 
 * @export
 * @class DrakeStoreService
 */
@Injectable()
export class DrakeStoreService {
  private droppableMap = new WeakMap<any, DroppableDirective>();
  private draggableMap = new WeakMap<any, DraggableDirective>();
  private dragulaOptions: any = {};
  private drake: any;

  private _animationFrame: any;
  private _dragging: any;
  private _lastKnownSourceComponent: any;

  constructor(private zone: NgZone) {
    this.dragulaOptions = this.createDrakeOptions();
    this.drake = dragula([], this.dragulaOptions);
    this.registerEvents();

    this._dragging = (elementComponent: any, sourceComponent: any, emitParams: any) => {
      
      let mirror: any;
      
      const animate = () => {

        if(!mirror) {
          mirror = document.getElementsByClassName('gu-mirror')[0];
        }

        emitParams.mirror = mirror;
        elementComponent.dragging.emit(emitParams);
        sourceComponent.dragging.emit(emitParams);

        this._animationFrame = requestAnimationFrame(animate);

      };

      return animate;

    };

  }

  register(droppable: DroppableDirective) {
    this.droppableMap.set(droppable.container, droppable);
    this.drake.containers.push(droppable.container);
  }

  remove(droppable: DroppableDirective) {
    this.droppableMap.delete(droppable.container);
    const idx = this.drake.containers.indexOf(droppable.container);
    if (idx > -1) {
      this.drake.containers.splice(idx, 1);
    }
  }

  registerDraggable(draggable: DraggableDirective) {
    this.draggableMap.set(draggable.element, draggable);
  }

  removeDraggable(draggable: DraggableDirective) {
    this.draggableMap.delete(draggable.element);
  }

  createDrakeOptions() {
    const accepts = (el: any, target: any, source: any, sibling: any) => {
      if (el.contains(target)) {
        return false;
      }
      const elementComponent = this.draggableMap.get(el);
      const targetComponent = this.droppableMap.get(target);
      if (elementComponent && targetComponent) {
        return elementComponent.dropZones.includes(targetComponent.dropZone);
      }
      return true;
    };

    const copy = (el: any, source: any) => {
      const sourceComponent = this.droppableMap.get(source);
      if (sourceComponent) {
        return sourceComponent.copy;
      }
      return false;
    };

    const moves = (el: any, source: any, handle: any, sibling: any) => {
      const elementComponent = this.draggableMap.get(el);
      if (elementComponent) {
        return elementComponent.moves(source, handle, sibling);
      }
      return true;
    };

    return {accepts, copy, moves, revertOnSpill: true};
  }

  registerEvents(): void {
    let dragElm: any;
    let draggedItem: any;
    let lastKnownSourceComponent: any;

    this.drake.on('drag', (el: any, source: any) => {

      let sourceComponent;
      let elementComponent;

      dragElm = el;

      if (!el || !source) {
        return;
      }

      const emitParams = {
        type: 'drag',
        value: undefined as any,
        el,
        source
      };

      if (this.droppableMap.has(source)) {
        sourceComponent = lastKnownSourceComponent = this.droppableMap.get(source);
        this.dragulaOptions.removeOnSpill = sourceComponent.removeOnSpill;
        sourceComponent.drag.emit(emitParams);
      }

      if (this.draggableMap.has(el)) {
        elementComponent = this.draggableMap.get(el);
        emitParams.value = draggedItem = elementComponent.model;  
        elementComponent.drag.emit(emitParams);
      } 

      emitParams.type = 'dragging';
      this.zone.runOutsideAngular(this._dragging(elementComponent, sourceComponent, emitParams));
    
    });

    this.drake.on('dragend', (el: any) => {
      window.cancelAnimationFrame(this._animationFrame);

      if (this.draggableMap.has(el)) {
        const elementComponent = this.draggableMap.get(el);
        elementComponent.dragend.emit({
          type: 'dragend',
          el
        });
      }

      if(lastKnownSourceComponent) {
        lastKnownSourceComponent.dragend.emit({
          type: 'dragned',
          el
        });
      }

    });

    this.drake.on('dragend', (el: any) => {
      window.cancelAnimationFrame(this._animationFrame);

      draggedItem = undefined;
      dragElm = el;

      if (this.draggableMap.has(el)) {
        const elementComponent = this.draggableMap.get(el);
        elementComponent.dragend.emit({
          type: 'dragend',
          el
        });
      }

    });

    this.drake.on('drop', (el: any, target: any, source: any) => {
      if (this.droppableMap.has(target)) {
        const targetComponent = this.droppableMap.get(target);
        let dropElmModel = draggedItem;

        if (this.droppableMap.has(source)) {
          const sourceComponent = lastKnownSourceComponent = this.droppableMap.get(source);

          const sourceModel = sourceComponent.model;
          const targetModel = targetComponent.model;

          const dropIndex = Array.prototype.indexOf.call(target.children, el);
          const dragIndex = (sourceModel && draggedItem) ? sourceModel.indexOf(draggedItem) : -1;

          if (dropIndex > -1 && targetModel) {
            if (dragIndex > -1 && sourceModel && target === source) {
              sourceModel.splice(dropIndex, 0, sourceModel.splice(dragIndex, 1)[0]);
            } else {
              
              if (el.parentNode === target) {
                target.removeChild(el);
              }

              const copy = !sourceModel || (dragElm !== el);
              if (copy) {
                dropElmModel = JSON.parse(JSON.stringify(dropElmModel));
              } else {
                if (el.parentNode !== source) {
                  // add element back, let angular remove it
                  source.append(el);
                }
                sourceModel.splice(dragIndex, 1);
              }
              targetModel.splice(dropIndex, 0, dropElmModel);
            }
          }
        }

        targetComponent.drop.emit({
          type: 'drop',
          el,
          source,
          value: dropElmModel
        });
      }
    });

    this.drake.on('remove', (el: any, container: any, source: any) => {
      if (this.droppableMap.has(source)) {
        const sourceComponent = lastKnownSourceComponent = this.droppableMap.get(source);
        const sourceModel = sourceComponent.model;

        const dragIndex = (draggedItem && sourceModel) ? sourceModel.indexOf(draggedItem) : -1;

        if (dragIndex > -1) {
          if (el.parentNode !== source) {
            // add element back, let angular remove it
            source.append(el);
          }
          sourceModel.splice(dragIndex, 1);
        }

        sourceComponent.remove.emit({
          type: 'remove',
          el,
          container,
          source,
          value: draggedItem
        });
      }
    });

    this.drake.on('cancel', (el: any, container: any, source: any) => {
      if (this.droppableMap.has(container)) {
        const containerComponent = lastKnownSourceComponent = this.droppableMap.get(container);
        containerComponent.cancel.emit({
          type: 'cancel',
          el,
          container,
          source,
          value: draggedItem
        });
      }
    });

    this.drake.on('over', (el: any, container: any, source: any) => {
      if (this.droppableMap.has(container)) {
        const containerComponent = lastKnownSourceComponent = this.droppableMap.get(container);
        containerComponent.over.emit({
          type: 'over',
          el,
          container,
          source,
          value: draggedItem
        });
      }
    });

    this.drake.on('out', (el: any, container: any, source: any) => {
      if (this.droppableMap.has(container)) {
        const containerComponent = lastKnownSourceComponent = this.droppableMap.get(container);
        containerComponent.out.emit({
          type: 'out',
          el,
          container,
          source,
          value: draggedItem
        });
      }
    });
  }
}
