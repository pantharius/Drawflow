export default class Drawflow {
  constructor(container, render = null, parent = null) {
    this.events = {};
    this.container = container;
    this.precanvas = null;
    this.nodeId = 1;
    this.ele_selected = null;
    this.node_selected = null;
    this.drag = false;
    this.reroute = false;
    this.reroute_fix_curvature = false;
    this.curvature = 0.5;
    this.reroute_curvature_start_end = 0.5;
    this.reroute_curvature = 0.5;
    this.reroute_width = 6;
    this.drag_point = false;
    this.editor_selected = false;
    this.connection = false;
    this.connection_ele = null;
    this.connection_selected = null;
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_x_start = 0;
    this.pos_y = 0;
    this.pos_y_start = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.line_path = 5;
    this.first_click = null;
    this.force_first_input = false;
    this.draggable_inputs = true;
    this.useuuid = false;
    this.parent = parent;
    this.mouseclick = null;

    this.noderegister = {};
    this.render = render;
    this.drawflow = { "drawflow": { "Home": { "data": {} }}};
    // Configurable options
    this.module = 'Home';
    this.editor_mode = 'edit';
    this.zoom = 1;
    this.zoom_max = 1.6;
    this.zoom_min = 0.5;
    this.zoom_value = 0.1;
    this.zoom_last_value = 1;

    // Mobile
    this.evCache = new Array();
    this.prevDiff = -1;
  }

  start () {
    // console.info("Start Drawflow!!");
    this.container.classList.add("parent-drawflow");
    this.container.tabIndex = 0;
    this.precanvas = document.createElement('div');
    this.precanvas.classList.add("drawflow");
    this.container.appendChild(this.precanvas);

    /* Mouse and Touch Actions */
    this.container.addEventListener('mouseup', this.dragEnd.bind(this));
    this.container.addEventListener('mousemove', this.position.bind(this));
    this.container.addEventListener('mousedown', this.click.bind(this) );

    this.container.addEventListener('touchend', this.dragEnd.bind(this));
    this.container.addEventListener('touchmove', this.position.bind(this));
    this.container.addEventListener('touchstart', this.click.bind(this));

    /* Context Menu */
    this.container.addEventListener('contextmenu', this.contextmenu.bind(this));
    /* Delete */
    this.container.addEventListener('keydown', this.key.bind(this));

    /* Zoom Mouse */
    this.container.addEventListener('wheel', this.zoom_enter.bind(this));
    /* Update data Nodes */
    this.container.addEventListener('input', this.updateNodeValue.bind(this));

    this.container.addEventListener('dblclick', this.dblclick.bind(this));
    /* Mobile zoom */
    this.container.onpointerdown = this.pointerdown_handler.bind(this);
    this.container.onpointermove = this.pointermove_handler.bind(this);
    this.container.onpointerup = this.pointerup_handler.bind(this);
    this.container.onpointercancel = this.pointerup_handler.bind(this);
    this.container.onpointerout = this.pointerup_handler.bind(this);
    this.container.onpointerleave = this.pointerup_handler.bind(this);

    this.load();
  }

  /* Mobile zoom */
  pointerdown_handler(ev) {
   this.evCache.push(ev);
  }

  pointermove_handler(ev) {
   for (var i = 0; i < this.evCache.length; i++) {
     if (ev.pointerId == this.evCache[i].pointerId) {
        this.evCache[i] = ev;
     break;
     }
   }

   if (this.evCache.length == 2) {
     // Calculate the distance between the two pointers
     var curDiff = Math.abs(this.evCache[0].clientX - this.evCache[1].clientX);

     if (this.prevDiff > 100) {
       if (curDiff > this.prevDiff) {
         // The distance between the two pointers has increased

         this.zoom_in();
       }
       if (curDiff < this.prevDiff) {
         // The distance between the two pointers has decreased
         this.zoom_out();
       }
     }
     this.prevDiff = curDiff;
   }
  }

  pointerup_handler(ev) {
    this.remove_event(ev);
    if (this.evCache.length < 2) {
      this.prevDiff = -1;
    }
  }
  remove_event(ev) {
   // Remove this event from the target's cache
   for (var i = 0; i < this.evCache.length; i++) {
     if (this.evCache[i].pointerId == ev.pointerId) {
       this.evCache.splice(i, 1);
       break;
     }
   }
  }
  /* End Mobile Zoom */
  load() {
    for (var key in this.drawflow.drawflow[this.module].data) {
      this.addNodeImport(this.drawflow.drawflow[this.module].data[key], this.precanvas);
    }

    if(this.reroute) {
      for (var key in this.drawflow.drawflow[this.module].data) {
        this.addRerouteImport(this.drawflow.drawflow[this.module].data[key]);
      }
    }

    for (var key in this.drawflow.drawflow[this.module].data) {
      this.updateConnectionNodes('node-'+key);
    }

    const editor = this.drawflow.drawflow;
    let number = 1;
    Object.keys(editor).map(function(moduleName, index) {
      Object.keys(editor[moduleName].data).map(function(id, index2) {
        if(parseInt(id) >= number) {
          number = parseInt(id)+1;
        }
      });
    });
    this.nodeId = number;
  }

  removeReouteConnectionSelected(){
    this.dispatch('connectionUnselected', true);
    if(this.reroute_fix_curvature) {
      this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
        item.classList.remove("selected");
      });
    }
  }

  click(e) {
    this.dispatch('click', e);
    this.mouseclick = e.which;
    if(this.editor_mode === 'fixed') {
      //return false;
       e.preventDefault();
       if([...e.target.classList].some(c=>c==='parent-drawflow'||c==='drawflow')) {
         this.ele_selected = e.target.closest(".parent-drawflow");
       } else {
         return false;
       }
    } else if(this.editor_mode === 'view') {
      if(e.target.closest(".drawflow") != null || e.target.matches('.parent-drawflow')) {
        this.ele_selected = e.target.closest(".parent-drawflow");
        e.preventDefault();
      }
    } else {
      this.first_click = e.target;
      this.ele_selected = e.target;
      if(e.button === 0) {
        this.contextmenuDel();
      }

      if(e.target.closest(".drawflow_content_node") != null) {
        this.ele_selected = e.target.closest(".drawflow_content_node").parentElement;
      }
    }
    let sel_classlist = [...this.ele_selected.classList];
    if(sel_classlist.includes('drawflow-node')){
      if(this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        if(this.node_selected != this.ele_selected) {
          this.dispatch('nodeUnselected', true);
        }
      }
      if(this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      if(this.node_selected != this.ele_selected) {
        this.dispatch('nodeSelected', this.ele_selected.id.slice(5));
      }
      this.node_selected = this.ele_selected;
      this.node_selected.classList.add("selected");
      if(!this.draggable_inputs) {
        if(e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT' && e.target.hasAttribute('contenteditable') !== true) {
          this.drag = true;
        }
      } else if(e.target.tagName !== 'SELECT') {
        this.drag = true;
      }
    }else if(sel_classlist.includes('output')){
      this.connection = true;
      if(this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
        this.dispatch('nodeUnselected', true);
      }
      if(this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.drawConnection(e.target);
    }else if(sel_classlist.includes('parent-drawflow') || sel_classlist.includes('drawflow')){
      if(this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
        this.dispatch('nodeUnselected', true);
      }
      if(this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.editor_selected = true;
    }else if(sel_classlist.includes('main-path')){
      if(this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
        this.dispatch('nodeUnselected', true);
      }
      if(this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
      this.connection_selected = this.ele_selected;
      this.connection_selected.classList.add("selected");
      const getClassStartsWith = (classStart) => [...this.connection_selected.parentElement.classList].find(c=>c.startsWith(classStart));
      if(getClassStartsWith('')){
        this.dispatch('connectionSelected', { output_id: getClassStartsWith("node_out_node-").slice(14), input_id: getClassStartsWith("node_in_node-").slice(13), output_class: getClassStartsWith("output_"), input_class: getClassStartsWith("input_") });
        if(this.reroute_fix_curvature) {
          this.connection_selected.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
            item.classList.add("selected");
          });
        }
      }
    }else if(sel_classlist.includes('point')){
      this.drag_point = true;
      this.ele_selected.classList.add("selected");
    }else if(sel_classlist.includes('drawflow-delete')){
      if(this.node_selected ) {
        this.removeNodeId(this.node_selected.id);
      }

      if(this.connection_selected) {
        this.removeConnection();
      }

      if(this.node_selected != null) {
        this.node_selected.classList.remove("selected");
        this.node_selected = null;
        this.dispatch('nodeUnselected', true);
      }
      if(this.connection_selected != null) {
        this.connection_selected.classList.remove("selected");
        this.removeReouteConnectionSelected();
        this.connection_selected = null;
      }
    }
    if (e.type === "touchstart") {
      this.pos_x = e.touches[0].clientX;
      this.pos_x_start = e.touches[0].clientX;
      this.pos_y = e.touches[0].clientY;
      this.pos_y_start = e.touches[0].clientY;
      this.mouse_x = e.touches[0].clientX;
      this.mouse_y = e.touches[0].clientY;
    } else {
      this.pos_x = e.clientX;
      this.pos_x_start = e.clientX;
      this.pos_y = e.clientY;
      this.pos_y_start = e.clientY;
    }
    if (['input','output','main-path'].includes(this.ele_selected.classList[0])) {
      e.preventDefault();
    }
    this.dispatch('clickEnd', e);
  }

  position(e) {
    let e_pos_x = (e.type === "touchmove") ? e.touches[0].clientX : e.clientX;
    let e_pos_y = (e.type === "touchmove") ? e.touches[0].clientY : e.clientY;


    if(this.connection) {
      this.updateConnection(e_pos_x, e_pos_y);
    }
    if(this.editor_selected && this.mouseclick == 3) {
      let x =  this.canvas_x + (-(this.pos_x - e_pos_x))
      let y = this.canvas_y + (-(this.pos_y - e_pos_y))
      this.dispatch('translate', { x: x, y: y});
      this.precanvas.style.transform = "translate("+x+"px, "+y+"px) scale("+this.zoom+")";
    }
    if(this.drag) {
      e.preventDefault();
      let x = (this.pos_x - e_pos_x) * this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom);
      let y = (this.pos_y - e_pos_y) * this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom);
      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      this.ele_selected.style.top = (this.ele_selected.offsetTop - y) + "px";
      this.ele_selected.style.left = (this.ele_selected.offsetLeft - x) + "px";

      this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_x = (this.ele_selected.offsetLeft - x);
      this.drawflow.drawflow[this.module].data[this.ele_selected.id.slice(5)].pos_y = (this.ele_selected.offsetTop - y);

      this.updateConnectionNodes(this.ele_selected.id)
    }

    if(this.drag_point) {

      this.pos_x = e_pos_x;
      this.pos_y = e_pos_y;

      let pos_x = this.pos_x * ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
      let pos_y = this.pos_y * ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

      this.ele_selected.setAttributeNS(null, 'cx', pos_x);
      this.ele_selected.setAttributeNS(null, 'cy', pos_y);

      const getClassStartsWith = (classStart) => [...this.ele_selected.parentElement.classList].find(c=>c.startsWith(classStart));
      const nodeUpdate = getClassStartsWith("node_out_node-").slice(9);
      const nodeUpdateIn = getClassStartsWith("node_in_node-").slice(13);
      const output_class = getClassStartsWith("output_");
      const input_class = getClassStartsWith("input_");

      let numberPointPosition = Array.from(this.ele_selected.parentElement.children).indexOf(this.ele_selected)-1;

      if(this.reroute_fix_curvature) {
        const numberMainPath = this.ele_selected.parentElement.querySelectorAll(".main-path").length-1;
        numberPointPosition -= numberMainPath;
        if(numberPointPosition < 0) {
          numberPointPosition = 0;
        }
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections.findIndex(function(item,i) {
        return item.node ===  nodeUpdateIn && item.output === input_class;
      });

      this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points[numberPointPosition] = { pos_x: pos_x, pos_y: pos_y };
      
      const parentSelected = [...this.ele_selected.parentElement.classList].find(c=>c.startsWith("node_out_node-")).slice(9);

      this.updateConnectionNodes(parentSelected);
    }

    if (e.type === "touchmove") {
      this.mouse_x = e_pos_x;
      this.mouse_y = e_pos_y;
    }
    this.dispatch('mouseMove', {x: e_pos_x,y: e_pos_y });
  }

  dragEnd(e) {
    if (e.type === "touchend") {
      var e_pos_x = this.mouse_x;
      var e_pos_y = this.mouse_y;
      var ele_last = document.elementFromPoint(e_pos_x, e_pos_y);
    } else {
      var e_pos_x = e.clientX;
      var e_pos_y = e.clientY;
      var ele_last = e.target;
    }

    if(this.drag) {
      if(this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
        this.dispatch('nodeMoved', this.ele_selected.id.slice(5));
      }
    }

    if(this.drag_point) {
      this.ele_selected.classList.remove("selected");
        if(this.pos_x_start != e_pos_x || this.pos_y_start != e_pos_y) {
          this.dispatch('rerouteMoved', [...this.ele_selected.parentElement.classList].find(c=>c.startsWith("node_out_node-")).slice(14));
        }
    }

    if(this.editor_selected && this.mouseclick == 3) {
      this.canvas_x = this.canvas_x + (-(this.pos_x - e_pos_x));
      this.canvas_y = this.canvas_y + (-(this.pos_y - e_pos_y));
      this.editor_selected = false;
    }
    if (this.connection === true) {
      let input_class;
      let in_io_class = "";
      if (ele_last.classList[0] === 'input' || (this.force_first_input && (ele_last.closest(".drawflow_content_node") != null || ele_last.classList[0] === 'drawflow-node'))) {

        if (this.force_first_input && (ele_last.closest(".drawflow_content_node") != null || ele_last.classList[0] === 'drawflow-node')) {
          if (ele_last.closest(".drawflow_content_node") != null) {
            var input_id = ele_last.closest(".drawflow_content_node").parentElement.id;
          } else {
            var input_id = ele_last.id;
          }
          if (Object.keys(this.getNodeFromId(input_id.slice(5)).inputs).length === 0) {
            input_class = false;
          } else {
            input_class = "input_1";
          }


        } else {
          // Fix connection;
          var input_id = ele_last.parentElement.parentElement.id;
          input_class = [...ele_last.classList].find(c => c.startsWith("input_"));
          in_io_class = [...ele_last.classList].find(c => c.startsWith("io_")).slice(3);
        }
        var output_id = this.ele_selected.parentElement.parentElement.id;
        var output_class = [...this.ele_selected.classList].find(c => c.startsWith("output_"));

        if (output_id !== input_id && input_class !== false) {
          if (this.container.querySelectorAll('.connection.node_in_' + input_id + '.node_out_' + output_id + '.' + output_class + '.' + input_class).length === 0) {

            let ioclass = [...this.connection_ele.classList].find(c => c.startsWith("io_")).slice(3);
            if(isOutputCompatible(in_io_class,ioclass) && isOutputFreeOrMultiple(this.drawflow.drawflow[this.module].data[input_id.slice(5)].inputs[input_class].connections,ioclass)) {
              // Conection no exist save connection

              this.connection_ele.classList.add("node_in_" + input_id);
              this.connection_ele.classList.add("node_out_" + output_id);
              this.connection_ele.classList.add(output_class);
              this.connection_ele.classList.add(input_class);
              var id_input = input_id.slice(5);
              var id_output = output_id.slice(5);

              this.drawflow.drawflow[this.module].data[id_output].outputs[output_class].connections.push({ "node": id_input, "output": input_class });
              this.drawflow.drawflow[this.module].data[id_input].inputs[input_class].connections.push({ "node": id_output, "input": output_class });
              this.updateConnectionNodes('node-' + id_output);
              this.updateConnectionNodes('node-' + id_input);
              this.dispatch('connectionCreated', { output_id: id_output, input_id: id_input, output_class: output_class, input_class: input_class });
            }else{
              console.error(`CONNECTION IMPOSSIBLE, TYPES DIFFERENTS: ioclass:${ioclass}, in_io_class:${in_io_class}`);
              this.dispatch('connectionCancel', true);
              this.connection_ele.remove();
            }
          } else {
            this.dispatch('connectionCancel', true);
            this.connection_ele.remove();
          }

          this.connection_ele = null;
        } else {
          // Connection exists Remove Connection;
          this.dispatch('connectionCancel', true);
          this.connection_ele.remove();
          this.connection_ele = null;
        }

      } else {
        // Remove Connection;
        this.dispatch('connectionCancel', true);
        this.connection_ele.remove();
        this.connection_ele = null;
      }
    }

    this.drag = false;
    this.drag_point = false;
    this.connection = false;
    this.ele_selected = null;
    this.editor_selected = false;
    this.mouseclick = null;

    this.dispatch('mouseUp', e);
  }
  contextmenu(e) {
    this.dispatch('contextmenu', e);
    e.preventDefault();
    if(this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if(this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
    };
    if(this.node_selected || this.connection_selected) {
      var deletebox = document.createElement('div');
      deletebox.classList.add("drawflow-delete");
      deletebox.innerHTML = "x";
      if(this.node_selected) {
        this.node_selected.appendChild(deletebox);

      }
      if(this.connection_selected && (this.connection_selected.parentElement.classList.length > 1)) {
        deletebox.style.top = e.clientY * ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y *  ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) ) + "px";
        deletebox.style.left = e.clientX * ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x *  ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) ) + "px";

        this.precanvas.appendChild(deletebox);

      }

    }

  }
  contextmenuDel() {
    if(this.precanvas.getElementsByClassName("drawflow-delete").length) {
      this.precanvas.getElementsByClassName("drawflow-delete")[0].remove()
    };
  }

  key(e) {
    this.dispatch('keydown', e);
    if(this.editor_mode === 'fixed' || this.editor_mode === 'view') {
      return false;
    }
    if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
      if(this.node_selected != null) {
        if(this.first_click.tagName !== 'INPUT' && this.first_click.tagName !== 'TEXTAREA' && this.first_click.hasAttribute('contenteditable') !== true) {
          this.removeNodeId(this.node_selected.id);
        }
      }
      if(this.connection_selected != null) {
        this.removeConnection();
      }
    }
  }

  zoom_enter(event, delta) {
    if (event.ctrlKey) {
      event.preventDefault()
      if(event.deltaY > 0) {
        // Zoom Out
        this.zoom_out();
      } else {
        // Zoom In
        this.zoom_in();
      }
    }
  }
  zoom_refresh(){
    this.dispatch('zoom', this.zoom);
    this.canvas_x = (this.canvas_x / this.zoom_last_value) * this.zoom;
    this.canvas_y = (this.canvas_y / this.zoom_last_value) * this.zoom;
    this.zoom_last_value = this.zoom;
    this.precanvas.style.transform = "translate("+this.canvas_x+"px, "+this.canvas_y+"px) scale("+this.zoom+")";
  }
  zoom_in() {
    if(this.zoom < this.zoom_max) {
        this.zoom+=this.zoom_value;
        this.zoom_refresh();
    }
  }
  zoom_out() {
    if(this.zoom > this.zoom_min) {
      this.zoom-=this.zoom_value;
        this.zoom_refresh();
    }
  }
  zoom_reset(){
    if(this.zoom != 1) {
      this.zoom = 1;
      this.zoom_refresh();
    }
  }

  createCurvature(start_pos_x, start_pos_y, end_pos_x, end_pos_y, curvature_value, type) {
    let line_x = start_pos_x;
    let line_y = start_pos_y;
    let x = end_pos_x;
    let y = end_pos_y;
    let curvature = curvature_value;
    //type openclose open close other
    switch (type) {
      case 'open': {
        const hx1 = line_x + Math.abs(x - line_x) * curvature;
        const hx2 = x - Math.abs(x - line_x) * ((start_pos_x >= end_pos_x) ? (curvature*-1) : curvature);
        return ' M '+ line_x +' '+ line_y +' C '+ hx1 +' '+ line_y +' '+ hx2 +' ' + y +' ' + x +'  ' + y;
      }
      case 'close': {
        const hx1 = line_x + Math.abs(x - line_x) * ((start_pos_x >= end_pos_x) ? (curvature*-1) : curvature);
        const hx2 = x - Math.abs(x - line_x) * curvature;
        return ' M '+ line_x +' '+ line_y +' C '+ hx1 +' '+ line_y +' '+ hx2 +' ' + y +' ' + x +'  ' + y;
      }
      case 'other': {
        const hx1 = line_x + Math.abs(x - line_x) * ((start_pos_x >= end_pos_x) ? (curvature*-1) : curvature);
        const hx2 = x - Math.abs(x - line_x) * ((start_pos_x >= end_pos_x) ? (curvature*-1) : curvature);
        return ' M '+ line_x +' '+ line_y +' C '+ hx1 +' '+ line_y +' '+ hx2 +' ' + y +' ' + x +'  ' + y;
      }
      default: {
        const hx1 = line_x + Math.abs(x - line_x) * curvature;
        const hx2 = x - Math.abs(x - line_x) * curvature;
        return ' M '+ line_x +' '+ line_y +' C '+ hx1 +' '+ line_y +' '+ hx2 +' ' + y +' ' + x +'  ' + y;
      }
    }

  }

  drawConnection(ele) {
    const connection = document.createElementNS('http://www.w3.org/2000/svg',"svg");
    this.connection_ele = connection;
    const path = document.createElementNS('http://www.w3.org/2000/svg',"path");
    path.classList.add("main-path");
    path.setAttributeNS(null, 'd', '');
    // path.innerHTML = 'a';
    connection.classList.add("connection");
    connection.appendChild(path);
    this.precanvas.appendChild(connection);
    const id_output = ele.parentElement.parentElement.id.slice(5);
    const output_class = [...ele.classList].find(c=>c.startsWith("output_"));
    const io_class = [...ele.classList].find(c=>c.startsWith("io_"));
    connection.classList.add(io_class);
    this.dispatch('connectionStart', { output_id: id_output, output_class, io_class });
  }

  updateConnection(eX, eY) {
    const precanvas = this.precanvas;
    const zoom = this.zoom;
    let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;
    const path = this.connection_ele.children[0];

    const line_x = this.ele_selected.offsetWidth/2 + (this.ele_selected.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
    const line_y = this.ele_selected.offsetHeight/2 + (this.ele_selected.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

    const x = eX * ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x *  ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) );
    const y = eY * ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y *  ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) );

    const curvature = this.curvature;
    const lineCurve = this.createCurvature(line_x, line_y, x, y, curvature, 'openclose');
    path.setAttributeNS(null, 'd', lineCurve);

  }

  addConnection(id_output, id_input, output_class, input_class) {
    const nodeOneModule = this.getModuleFromNodeId(id_output);
    const nodeTwoModule = this.getModuleFromNodeId(id_input);
    if(nodeOneModule === nodeTwoModule) {

      const dataNode = this.getNodeFromId(id_output);
      let exist = false;
      for(let checkOutput in dataNode.outputs[output_class].connections){
        const connectionSearch = dataNode.outputs[output_class].connections[checkOutput]
        if(connectionSearch.node == id_input && connectionSearch.output == input_class) {
            exist = true;
        }
      }
      // Check connection exist
      if(exist === false) {

        const outType = this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].type;
        const inType = this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].type;
        
        if(isOutputCompatible(inType,outType) && isOutputFreeOrMultiple(dataNode.outputs[output_class].connections[checkOutput],outType)){
          //Create Connection
          this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.push( {"node": id_input.toString(), "output": input_class});
          this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.push( {"node": id_output.toString(), "input": output_class});

          if(this.module === nodeOneModule) {
          //Draw connection
            const connection = document.createElementNS('http://www.w3.org/2000/svg',"svg");
            const path = document.createElementNS('http://www.w3.org/2000/svg',"path");
            path.classList.add("main-path");
            path.setAttributeNS(null, 'd', '');
            // path.innerHTML = 'a';
            connection.classList.add("connection");
            connection.classList.add("node_in_node-"+id_input);
            connection.classList.add("node_out_node-"+id_output);
            connection.classList.add(output_class);
            connection.classList.add(input_class);
            connection.appendChild(path);
            this.precanvas.appendChild(connection);
            this.updateConnectionNodes('node-'+id_output);
            this.updateConnectionNodes('node-'+id_input);
          }

          this.dispatch('connectionCreated', { output_id: id_output, input_id: id_input, output_class:  output_class, input_class: input_class});
        
        }
      }
    }
  }

  updateConnectionNodes(id) {

    // Aquí nos quedamos;
    const idSearch = 'node_in_'+id;
    const idSearchOut = 'node_out_'+id;
    const container = this.container;
    const precanvas = this.precanvas;
    const curvature = this.curvature;
    const createCurvature = this.createCurvature;
    const reroute_curvature = this.reroute_curvature;
    const reroute_curvature_start_end = this.reroute_curvature_start_end;
    const reroute_fix_curvature = this.reroute_fix_curvature;
    const rerouteWidth = this.reroute_width;
    const zoom = this.zoom;
    let precanvasWitdhZoom = precanvas.clientWidth / (precanvas.clientWidth * zoom);
    precanvasWitdhZoom = precanvasWitdhZoom || 0;
    let precanvasHeightZoom = precanvas.clientHeight / (precanvas.clientHeight * zoom);
    precanvasHeightZoom = precanvasHeightZoom || 0;

    const elemsOut = container.querySelectorAll(`.${idSearchOut}`);

    Object.keys(elemsOut).map(function(item, index) {
      if(elemsOut[item].querySelector('.point') === null) {

        var elemtsearchId_out = container.querySelector(`#${id}`);

        var id_search = [...elemsOut[item].classList].find(c=>c.startsWith("node_in_")).replace('node_in_', '');
        var elemtsearchId = container.querySelector(`#${id_search}`);

        var elemtsearch = elemtsearchId.querySelectorAll('.'+[...elemsOut[item].classList].find(c=>c.startsWith("input_")))[0]

        var eX = elemtsearch.offsetWidth/2 + (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
        var eY = elemtsearch.offsetHeight/2 + (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

        var elemtsearchOut = elemtsearchId_out.querySelectorAll('.'+[...elemsOut[item].classList].find(c=>c.startsWith("output_")))[0]

        var line_x =  elemtsearchOut.offsetWidth/2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
        var line_y =  elemtsearchOut.offsetHeight/2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

        var x = eX;
        var y = eY;

        const lineCurve = createCurvature(line_x, line_y, x, y, curvature, 'openclose');
        elemsOut[item].children[0].setAttributeNS(null, 'd', lineCurve );
      } else {
        const points = elemsOut[item].querySelectorAll('.point');
        let linecurve = '';
        const reoute_fix = [];
        points.forEach((item, i) => {
          if(i === 0 && ((points.length -1) === 0)) {

            var elemtsearchId_out = container.querySelector(`#${id}`);
            var elemtsearch = item;

            var eX =  (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY =  (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;

            var elemtsearchOut = elemtsearchId_out.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("output_")))[0]
            var line_x =  elemtsearchOut.offsetWidth/2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var line_y =  elemtsearchOut.offsetHeight/2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            var elemtsearchId_out = item;
            var id_search = [...item.parentElement.classList].find(c=>c.startsWith("node_in_")).replace('node_in_', '');
            var elemtsearchId = container.querySelector(`#${id_search}`);
            var elemtsearch = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]

            var elemtsearchIn = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]
            var eX =  elemtsearchIn.offsetWidth/2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var eY =  elemtsearchIn.offsetHeight/2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;


            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else if(i === 0) {

            var elemtsearchId_out = container.querySelector(`#${id}`);
            var elemtsearch = item;

            var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;

            var elemtsearchOut = elemtsearchId_out.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("output_")))[0]
            var line_x =  elemtsearchOut.offsetWidth/2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var line_y =  elemtsearchOut.offsetHeight/2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            // SECOND
            var elemtsearchId_out = item;
            var elemtsearch = points[i+1];

            var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else if (i === (points.length -1)) {

            var elemtsearchId_out = item;

            var id_search = [...item.parentElement.classList].find(c=>c.startsWith("node_in_")).replace('node_in_', '');
            var elemtsearchId = container.querySelector(`#${id_search}`);
            var elemtsearch = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]

            var elemtsearchIn = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]
            var eX =  elemtsearchIn.offsetWidth/2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var eY =  elemtsearchIn.offsetHeight/2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;
            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else {
            var elemtsearchId_out = item;
            var elemtsearch = points[i+1];

            var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
            var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) +rerouteWidth;
            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * (precanvas.clientWidth / (precanvas.clientWidth * zoom)) + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * (precanvas.clientHeight / (precanvas.clientHeight * zoom)) + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          }

        });
        if(reroute_fix_curvature) {
          reoute_fix.forEach((itempath, i) => {
            elemsOut[item].children[i].setAttributeNS(null, 'd', itempath);
          });

        } else {
          elemsOut[item].children[0].setAttributeNS(null, 'd', linecurve);
        }

      }
    })

    const elems = container.querySelectorAll(`.${idSearch}`);
    Object.keys(elems).map(function(item, index) {

      if(elems[item].querySelector('.point') === null) {
        var elemtsearchId_in = container.querySelector(`#${id}`);

        var id_search = [...elems[item].classList].find(c=>c.startsWith("node_out_")).replace('node_out_', '');
        var elemtsearchId = container.querySelector(`#${id_search}`);
        var elemtsearch = elemtsearchId.querySelectorAll('.'+[...elems[item].classList].find(c=>c.startsWith("output_")))[0]

        var line_x = elemtsearch.offsetWidth/2 + (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
        var line_y = elemtsearch.offsetHeight/2 + (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

        var elemtsearchId_in = elemtsearchId_in.querySelectorAll('.'+[...elems[item].classList].find(c=>c.startsWith("input_")))[0]
        var x = elemtsearchId_in.offsetWidth/2 + (elemtsearchId_in.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
        var y = elemtsearchId_in.offsetHeight/2 + (elemtsearchId_in.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

        const lineCurve = createCurvature(line_x, line_y, x, y, curvature, 'openclose');
        elems[item].children[0].setAttributeNS(null, 'd', lineCurve );

      } else {
        const points = elems[item].querySelectorAll('.point');
        let linecurve = '';
        const reoute_fix = [];
        points.forEach((item, i) => {
          if(i === 0 && ((points.length -1) === 0)) {

            var elemtsearchId_out = container.querySelector(`#${id}`);
            var elemtsearch = item;

            var line_x = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var line_y = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom +rerouteWidth;

            var elemtsearchIn = elemtsearchId_out.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]
            var eX =  elemtsearchIn.offsetWidth/2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var eY =  elemtsearchIn.offsetHeight/2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            var elemtsearchId_out = item;
            var id_search = [...item.parentElement.classList].find(c=>c.startsWith("node_out_")).replace('node_out_', '');
            var elemtsearchId = container.querySelector(`#${id_search}`);
            var elemtsearch = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("output_")))[0]

            var elemtsearchOut = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("output_")))[0]
            var line_x =  elemtsearchOut.offsetWidth/2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var line_y =  elemtsearchOut.offsetHeight/2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

            var eX = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);


          } else if(i === 0) {
            // FIRST
            var elemtsearchId_out = item;
            var id_search = [...item.parentElement.classList].find(c=>c.startsWith("node_out_")).replace('node_out_', '');
            var elemtsearchId = container.querySelector(`#${id_search}`);
            var elemtsearch = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("output_")))[0]
            var elemtsearchOut = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("output_")))[0]
            var line_x =  elemtsearchOut.offsetWidth/2 + (elemtsearchOut.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var line_y =  elemtsearchOut.offsetHeight/2 + (elemtsearchOut.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

            var eX = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'open');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

            // SECOND
            var elemtsearchId_out = item;
            var elemtsearch = points[i+1];

            var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom +rerouteWidth;
            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else if (i === (points.length -1)) {

            var elemtsearchId_out = item;

            var id_search = [...item.parentElement.classList].find(c=>c.startsWith("node_in_")).replace('node_in_', '');
            var elemtsearchId = container.querySelector(`#${id_search}`);
            var elemtsearch = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]

            var elemtsearchIn = elemtsearchId.querySelectorAll('.'+[...item.parentElement.classList].find(c=>c.startsWith("input_")))[0]
            var eX =  elemtsearchIn.offsetWidth/2 + (elemtsearchIn.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom;
            var eY =  elemtsearchIn.offsetHeight/2 + (elemtsearchIn.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom;

            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature_start_end, 'close');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);

          } else {

            var elemtsearchId_out = item;
            var elemtsearch = points[i+1];

            var eX = (elemtsearch.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var eY = (elemtsearch.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom +rerouteWidth;
            var line_x = (elemtsearchId_out.getBoundingClientRect().x - precanvas.getBoundingClientRect().x ) * precanvasWitdhZoom + rerouteWidth;
            var line_y = (elemtsearchId_out.getBoundingClientRect().y - precanvas.getBoundingClientRect().y ) * precanvasHeightZoom + rerouteWidth;
            var x = eX;
            var y = eY;

            var lineCurveSearch = createCurvature(line_x, line_y, x, y, reroute_curvature, 'other');
            linecurve += lineCurveSearch;
            reoute_fix.push(lineCurveSearch);
          }

        });
        if(reroute_fix_curvature) {
          reoute_fix.forEach((itempath, i) => {
            elems[item].children[i].setAttributeNS(null, 'd', itempath);
          });

        } else {
          elems[item].children[0].setAttributeNS(null, 'd', linecurve);
        }

      }
    })
  }

  dblclick(e) {
    if(this.connection_selected != null && this.reroute) {
        this.createReroutePoint(this.connection_selected);
    }

    if(e.target.classList[0] === 'point') {
        this.removeReroutePoint(e.target);
    }
  }

  createReroutePoint(ele) {
      this.connection_selected.classList.remove("selected");
      const getClassStartsWith = (classStart) => [...this.connection_selected.parentElement.classList].find(c=>c.startsWith(classStart));
      const nodeUpdate = getClassStartsWith('node_out_node-').slice(9);
      const nodeUpdateIn = getClassStartsWith('node_in_node-').slice(13);
      const output_class = getClassStartsWith('output_');
      const input_class = getClassStartsWith('input_');
      this.connection_selected = null;
      const point = document.createElementNS('http://www.w3.org/2000/svg',"circle");
      point.classList.add("point");
      const pos_x = this.pos_x * ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)) - (this.precanvas.getBoundingClientRect().x * ( this.precanvas.clientWidth / (this.precanvas.clientWidth * this.zoom)));
      const pos_y = this.pos_y * ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)) - (this.precanvas.getBoundingClientRect().y * ( this.precanvas.clientHeight / (this.precanvas.clientHeight * this.zoom)));

      point.setAttributeNS(null, 'cx', pos_x);
      point.setAttributeNS(null, 'cy', pos_y);
      point.setAttributeNS(null, 'r', this.reroute_width);

      let position_add_array_point = 0;
      if(this.reroute_fix_curvature) {

        const numberPoints = ele.parentElement.querySelectorAll(".main-path").length;
        const path = document.createElementNS('http://www.w3.org/2000/svg',"path");
        path.classList.add("main-path");
        path.setAttributeNS(null, 'd', '');

        ele.parentElement.insertBefore(path, ele.parentElement.children[numberPoints]);
        if(numberPoints === 1) {
          ele.parentElement.appendChild(point);
        }  else {
          const search_point = Array.from(ele.parentElement.children).indexOf(ele)
          position_add_array_point = search_point;
          ele.parentElement.insertBefore(point, ele.parentElement.children[search_point+numberPoints+1]);
        }

      } else {
        ele.parentElement.appendChild(point);
      }

      const nodeId = nodeUpdate.slice(5);
      const searchConnection = this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections.findIndex(function(item,i) {
        return item.node ===  nodeUpdateIn && item.output === input_class;
      });

      if(this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points === undefined)  {
        this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points = [];
      }

      if(this.reroute_fix_curvature) {

        if(position_add_array_point > 0 || this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points !== []) {
          this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.splice(position_add_array_point, 0, { pos_x: pos_x, pos_y: pos_y });
        } else {
          this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.push({ pos_x: pos_x, pos_y: pos_y });
        }

        ele.parentElement.querySelectorAll(".main-path").forEach((item, i) => {
          item.classList.remove("selected");
        });

      } else {
        this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.push({ pos_x: pos_x, pos_y: pos_y });
      }

      this.dispatch('addReroute', nodeId);
      this.updateConnectionNodes(nodeUpdate);
  }

  removeReroutePoint(ele) {
    const getClassStartsWith = (classStart) => [...ele.parentElement.classList].find(c=>c.startsWith(classStart));
    const nodeUpdate = getClassStartsWith("node_out_node-").slice(9);
    const nodeUpdateIn = getClassStartsWith("node_in_node-").slice(13);
    const output_class = getClassStartsWith("output_");
    const input_class = getClassStartsWith("input_");

    let numberPointPosition = Array.from(ele.parentElement.children).indexOf(ele);
    const nodeId = nodeUpdate.slice(5);
    const searchConnection = this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections.findIndex(function(item,i) {
      return item.node ===  nodeUpdateIn && item.output === input_class;
    });

    if(this.reroute_fix_curvature) {
       const numberMainPath = ele.parentElement.querySelectorAll(".main-path").length
       ele.parentElement.children[numberMainPath-1].remove();
       numberPointPosition -= numberMainPath;
       if(numberPointPosition < 0) {
         numberPointPosition = 0;
       }
    } else {
      numberPointPosition--;
    }
    this.drawflow.drawflow[this.module].data[nodeId].outputs[output_class].connections[searchConnection].points.splice(numberPointPosition,1);

    ele.remove();
    this.dispatch('removeReroute', nodeId);
    this.updateConnectionNodes(nodeUpdate);
  }

  registerNode(name, html, props = null, options = null) {
    this.noderegister[name] = {html: html, props: props, options: options};
  }

  getNodeFromId(id) {
    const moduleName = this.getModuleFromNodeId(id)
    return JSON.parse(JSON.stringify(this.drawflow.drawflow[moduleName].data[id]));
  }
  getNodesFromName(name) {
    const nodes = [];
    const editor = this.drawflow.drawflow
    Object.keys(editor).map(function(moduleName, index) {
      for (const node in editor[moduleName].data) {
        if(editor[moduleName].data[node].name == name) {
          nodes.push(editor[moduleName].data[node].id);
        }
      }
    });
    return nodes;
  }

  addNode (name, num_in, num_out, ele_pos_x, ele_pos_y, classoverride, data, html, typenode = false) {
    let newNodeId = (this.useuuid) ? this.getUuid() : this.nodeId;
    const parent = document.createElement('div');
    parent.classList.add("parent-node");

    const node = document.createElement('div');
    node.innerHTML = "";
    node.setAttribute("id", "node-"+newNodeId);
    node.classList.add("drawflow-node");
    if(classoverride != '') {
      node.classList.add(...classoverride.split(' '));
    }

    const inputs = document.createElement('div');
    inputs.classList.add("inputs");

    const outputs = document.createElement('div');
    outputs.classList.add("outputs");

    const json_inputs = {}
    for(let x = 0; x < num_in; x++) {
      const input = document.createElement('div');
      input.classList.add("input");
      input.classList.add("input_"+(x+1));
      json_inputs["input_"+(x+1)] = { "connections": []};
      inputs.appendChild(input);
    }

    const json_outputs = {}
    for(let x = 0; x < num_out; x++) {
      const output = document.createElement('div');
      output.classList.add("output");
      output.classList.add("output_"+(x+1));
      json_outputs["output_"+(x+1)] = { "connections": []};
      outputs.appendChild(output);
    }

    const content = document.createElement('div');
    content.classList.add("drawflow_content_node");
    if(typenode === false) {
      content.innerHTML = html;
    } else if (typenode === true) {
      content.appendChild(this.noderegister[html].html.cloneNode(true));
    } else if(typenode === "svelte") {
      const node = this.noderegister[html];
      const NodeComponent = node.html;
      try {
        let comp = new NodeComponent({
          target: content,
          props: {...node.props,nodeid:newNodeId,datas:node.data}
        });
        
        let compinputs;
        let compoutputs;
        try{
          compinputs = comp.inputs;
          compoutputs = comp.outputs;
        }catch(err){
          compinputs = node.props.inputs;
          compoutputs = node.props.outputs;
        }
        if(compinputs && Object.entries(compinputs).length>0){
          for (const [inputkey,inputvalue] of Object.entries(compinputs)) {
            const input = document.createElement('div');
            input.classList.add("input");
            input.classList.add("input_"+inputkey);
            input.classList.add("io_"+inputvalue.type);
            input.style = `--input-name:"${inputvalue.name}";`;
            json_inputs["input_"+inputkey] = { "connections": [], ...inputvalue };
            inputs.appendChild(input);
          }
        }
        if(compoutputs && Object.entries(compoutputs).length>0){
          for (const [outputkey,outputvalue] of Object.entries(compoutputs)) {
            const output = document.createElement('div');
            output.classList.add("output");
            output.classList.add("output_"+outputkey);
            output.classList.add("io_"+outputvalue.type);
            output.style = `--output-name:"${outputvalue.name}";`;
            json_outputs["output_"+outputkey] = { "connections": [], ...outputvalue };
            outputs.appendChild(output);
          }
        }
      } catch (e) { /* ... */ }
    } else if(parseInt(this.render.version) === 3 ) {
      //Vue 3
      let wrapper = this.render.h(this.noderegister[html].html, this.noderegister[html].props, this.noderegister[html].options);
      wrapper.appContext = this.parent;
      this.render.render(wrapper,content);

    } else {
      // Vue 2
      let wrapper = new this.render({
        parent: this.parent,
        render: h => h(this.noderegister[html].html, { props: this.noderegister[html].props }),
        ...this.noderegister[html].options
      }).$mount()
      //
      content.appendChild(wrapper.$el);
    }

    if(typeof typenode === "boolean"){
      Object.entries(data).forEach(function (key, value) {
        if(typeof key[1] === "object") {
          insertObjectkeys(null, key[0], key[0]);
        } else {
          const elems = content.querySelectorAll('[df-'+key[0]+']');
          for (const elem of elems) {
            elem.value = key[1];
            if(elem.isContentEditable) {
              elem.innerText = key[1];
            }
          }
        }
      })
  
      function insertObjectkeys(object, name, completname) {
        object = (object === null) ? data[name] : object[name];
        if(object !== null) {
          Object.entries(object).forEach(function (key, value) {
            if(typeof key[1] === "object") {
              insertObjectkeys(object, key[0], completname+'-'+key[0]);
            } else {
              const elems = content.querySelectorAll('[df-'+completname+'-'+key[0]+']');
              for (const elem of elems) {
                elem.value = key[1];
                if(elem.isContentEditable) {
                  elem.innerText = key[1];
                }
              }
            }
          });
        }
      }
    }
    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);
    node.style.top = ele_pos_y + "px";
    node.style.left = ele_pos_x + "px";
    parent.appendChild(node);
    this.precanvas.appendChild(parent);
    var json = {
      id: newNodeId,
      name: name,
      data: data,
      class: classoverride,
      html: html,
      typenode: typenode,
      inputs: json_inputs,
      outputs: json_outputs,
      pos_x: ele_pos_x,
      pos_y: ele_pos_y,
    }
    this.drawflow.drawflow[this.module].data[newNodeId] = json;
    this.dispatch('nodeCreated', newNodeId);
    if (!this.useuuid) {
      this.nodeId++;
    }
    return newNodeId;
  }

  addNodeImport (dataNode, precanvas) {
    const parent = document.createElement('div');
    parent.classList.add("parent-node");

    const node = document.createElement('div');
    node.innerHTML = "";
    node.setAttribute("id", "node-"+dataNode.id);
    node.classList.add("drawflow-node");
    if(dataNode.class != '') {
      node.classList.add(...dataNode.class.split(' '));
    }

    const inputs = document.createElement('div');
    inputs.classList.add("inputs");

    const outputs = document.createElement('div');
    outputs.classList.add("outputs");

    for (const [input_item, input_value] of Object.entries(dataNode.inputs)) {
      const input = document.createElement('div');
      input.classList.add("input");
      input.classList.add(input_item);
      input.classList.add("io_"+input_value.type);
      input.style = `--input-name:"${input_value.name}";`;
      inputs.appendChild(input);
      
      for (const conn of input_value.connections) {

        const connection = document.createElementNS('http://www.w3.org/2000/svg',"svg");
        const path = document.createElementNS('http://www.w3.org/2000/svg',"path");
        path.classList.add("main-path");
        path.setAttributeNS(null, 'd', '');
        // path.innerHTML = 'a';
        connection.classList.add("connection");
        connection.classList.add("node_in_node-"+dataNode.id);
        connection.classList.add("node_out_node-"+conn.node);
        connection.classList.add(conn.input);
        connection.classList.add(input_item);
        connection.classList.add("io_"+input_value.type);

        connection.appendChild(path);
        precanvas.appendChild(connection);
      };
    };


    for (const [outputkey,outputvalue] of Object.entries(dataNode.outputs)) {
      const output = document.createElement('div');
      output.classList.add("output");
      output.classList.add(outputkey);
      output.classList.add("io_"+outputvalue.type);
      output.style = `--output-name:"${outputvalue.name}";`;
      outputs.appendChild(output);
    }

    const content = document.createElement('div');
    content.classList.add("drawflow_content_node");

    if(dataNode.typenode === false) {
      content.innerHTML = dataNode.html;
    } else if (dataNode.typenode === true) {
      content.appendChild(this.noderegister[dataNode.html].html.cloneNode(true));
    } else if(dataNode.typenode === "svelte") {
      const node = this.noderegister[dataNode.html];
      const NodeComponent = node.html;
      try {
        new NodeComponent({
          target: content,
          props: {...node.props,nodeid:dataNode.id,datas:dataNode.data}
        });
      } catch (e) { /* ... */ }
    } else if(parseInt(this.render.version) === 3 ) {
      //Vue 3
      let wrapper = this.render.h(this.noderegister[dataNode.html].html, this.noderegister[dataNode.html].props, this.noderegister[dataNode.html].options);
      wrapper.appContext = this.parent;
      this.render.render(wrapper,content);

    } else {
      //Vue 2
      let wrapper = new this.render({
        parent: this.parent,
        render: h => h(this.noderegister[dataNode.html].html, { props: this.noderegister[dataNode.html].props }),
        ...this.noderegister[dataNode.html].options
      }).$mount()
      content.appendChild(wrapper.$el);
    }

    if(typeof typenode === "boolean"){
      Object.entries(dataNode.data).forEach(function (key, value) {
        if(typeof key[1] === "object") {
          insertObjectkeys(null, key[0], key[0]);
        } else {
          const elems = content.querySelectorAll('[df-'+key[0]+']');
          for (const elem of elems) {
            elem.value = key[1];
            if(elem.isContentEditable) {
              elem.innerText = key[1];
            }
          }
        }
      })

      function insertObjectkeys(object, name, completname) {
        object = (object === null) ? dataNode.data[name] : object[name];

        if(object !== null) {
          Object.entries(object).forEach(function (key, value) {
            if(typeof key[1] === "object") {
              insertObjectkeys(object, key[0], completname+'-'+key[0]);
            } else {
              const elems = content.querySelectorAll('[df-'+completname+'-'+key[0]+']');
              for (const elem of elems) {
                elem.value = key[1];
                if(elem.isContentEditable) {
                  elem.innerText = key[1];
                }
              }
            }
          });
        }
      }
    }

    node.appendChild(inputs);
    node.appendChild(content);
    node.appendChild(outputs);
    node.style.top = dataNode.pos_y + "px";
    node.style.left = dataNode.pos_x + "px";
    parent.appendChild(node);
    this.precanvas.appendChild(parent);
  }

  addRerouteImport(dataNode) {
    const reroute_width = this.reroute_width
    const reroute_fix_curvature = this.reroute_fix_curvature
    const container = this.container;
    Object.keys(dataNode.outputs).map(function(output_item, index) {
      Object.keys(dataNode.outputs[output_item].connections).map(function(input_item, index) {
        const points = dataNode.outputs[output_item].connections[input_item].points
        if(points !== undefined) {

          points.forEach((item, i) => {
            const input_id = dataNode.outputs[output_item].connections[input_item].node;
            const input_class = dataNode.outputs[output_item].connections[input_item].output;
            const ele = container.querySelector('.connection.node_in_node-'+input_id+'.node_out_node-'+dataNode.id+'.'+output_item+'.'+input_class);

            if(reroute_fix_curvature) {
              if(i === 0) {
                const nbZ = points.length;
                for (let z = 0; z < nbZ; z++) {
                  const path = document.createElementNS('http://www.w3.org/2000/svg',"path");
                  path.classList.add("main-path");
                  path.setAttributeNS(null, 'd', '');
                  ele.appendChild(path);
                }
              }
            }

            const point = document.createElementNS('http://www.w3.org/2000/svg',"circle");
            point.classList.add("point");
            const pos_x = item.pos_x;
            const pos_y = item.pos_y;

            point.setAttributeNS(null, 'cx', pos_x);
            point.setAttributeNS(null, 'cy', pos_y);
            point.setAttributeNS(null, 'r', reroute_width);

            ele.appendChild(point);
          });
        };
      });
    });
  }

  updateNodeValue(event) {
    const attrs = event.target.attributes
    for (const attr of attrs) {
      if (attr.nodeName.startsWith('df-')) {
        const keys = attr.nodeName.slice(3).split("-");
        let target = this.drawflow.drawflow[this.module].data[event.target.closest(".drawflow_content_node").parentElement.id.slice(5)].data;
        for (let index = 0; index < keys.length - 1; index += 1) {
          if (target[keys[index]] == null) {
            target[keys[index]] = {};
          }
          target = target[keys[index]];
        }
        target[keys[keys.length - 1]] = event.target.value;
        if (event.target.isContentEditable) {
          target[keys[keys.length - 1]] = event.target.innerText;
        }
        this.dispatch('nodeDataChanged', event.target.closest(".drawflow_content_node").parentElement.id.slice(5));
      }
    }
  }

  updateNodeDataFromId(id, data) {
    var moduleName = this.getModuleFromNodeId(id)
    this.drawflow.drawflow[moduleName].data[id].data = data;
    if(this.module === moduleName && typeof this.drawflow.drawflow[moduleName].data[id].typenode === "boolean") {
      const content = this.container.querySelector('#node-'+id);

      Object.entries(data).forEach(function (key, value) {
        if(typeof key[1] === "object") {
          insertObjectkeys(null, key[0], key[0]);
        } else {
          var elems = content.querySelectorAll('[df-'+key[0]+']');
            for(var i = 0; i < elems.length; i++) {
              elems[i].value = key[1];
              if(elems[i].isContentEditable) {
                elems[i].innerText = key[1];
              }
            }
        }
      })

      function insertObjectkeys(object, name, completname) {
        object = (object === null) ? data[name] : object[name];
        if(object !== null) {
          Object.entries(object).forEach(function (key, value) {
            if(typeof key[1] === "object") {
              insertObjectkeys(object, key[0], completname+'-'+key[0]);
            } else {
              var elems = content.querySelectorAll('[df-'+completname+'-'+key[0]+']');
                for(var i = 0; i < elems.length; i++) {
                  elems[i].value = key[1];
                  if(elems[i].isContentEditable) {
                    elems[i].innerText = key[1];
                  }
                }
            }
          });
        }
      }

    }
  }

  addNodeInput(id, inputkey, inputvalue) {
    var moduleName = this.getModuleFromNodeId(id)
    if(this.module === moduleName) {
      //Draw input
      const input = document.createElement('div');
      input.classList.add("input");
      input.classList.add("input_"+inputkey);
      input.classList.add("io_"+inputvalue.type);
      input.style = `--input-name:"${inputvalue.name}";`;
      const parent = this.container.querySelector('#node-'+id+' .inputs');
      parent.appendChild(input);
      this.updateConnectionNodes('node-'+id);
    }
    this.drawflow.drawflow[moduleName].data[id].inputs["input_"+inputkey] = { "connections": [], ...inputvalue };
  }

  addNodeOutput(id) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    const numOutputs = Object.keys(infoNode.outputs).length;
    if(this.module === moduleName) {
      //Draw output
      const output = document.createElement('div');
      output.classList.add("output");
      output.classList.add("output_"+(numOutputs+1));
      const parent = this.container.querySelector('#node-'+id+' .outputs');
      parent.appendChild(output);
      this.updateConnectionNodes('node-'+id);

    }
    this.drawflow.drawflow[moduleName].data[id].outputs["output_"+(numOutputs+1)] = { "connections": []};
  }

  removeNodeInput(id, input_class) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    if(this.module === moduleName) {
      this.container.querySelector('#node-'+id+' .inputs .input.'+input_class).remove();
    }
    const removeInputs = [];
    Object.keys(infoNode.inputs[input_class].connections).map(function(key, index) {
      const id_output = infoNode.inputs[input_class].connections[index].node;
      const output_class = infoNode.inputs[input_class].connections[index].input;
      removeInputs.push({id_output, id, output_class, input_class})
    })
    // Remove connections
    removeInputs.forEach((item, i) => {
      this.removeSingleConnection(item.id_output, item.id, item.output_class, item.input_class);
    });

    delete this.drawflow.drawflow[moduleName].data[id].inputs[input_class];

    // Update connection
    const connectionsInputs = {...this.drawflow.drawflow[moduleName].data[id].inputs};

    this.drawflow.drawflow[moduleName].data[id].inputs = {};
    const input_class_id = input_class.slice(6);
    let nodeUpdates = [];
    for (const [key,item] of Object.entries(connectionsInputs)) {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push(itemx);
      });
      this.drawflow.drawflow[moduleName].data[id].inputs[key] = item;
    }
    nodeUpdates =  new Set(nodeUpdates.map(e => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdates).map(e => JSON.parse(e));

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections.forEach((itemz, g) => {
          if(itemz.node == id) {
            const output_id = itemz.output.slice(6);
            if(parseInt(input_class_id) < parseInt(output_id)) {
              if(this.module === moduleName) {
                const ele = this.container.querySelector(".connection.node_in_node-"+id+".node_out_node-"+itemx.node+"."+itemx.input+".input_"+output_id);
                ele.classList.remove('input_'+output_id);
                ele.classList.add('input_'+(output_id-1));
              }
              if(itemz.points) {
                  this.drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections[g] = { node: itemz.node, output: 'input_'+(output_id-1), points: itemz.points }
              } else {
                  this.drawflow.drawflow[moduleName].data[itemx.node].outputs[itemx.input].connections[g] = { node: itemz.node, output: 'input_'+(output_id-1)}
              }
            }
          }
      });
    });
    this.updateConnectionNodes('node-'+id);
  }

  removeNodeOutput(id, output_class) {
    var moduleName = this.getModuleFromNodeId(id)
    const infoNode = this.getNodeFromId(id)
    if(this.module === moduleName) {
      this.container.querySelector('#node-'+id+' .outputs .output.'+output_class).remove();
    }
    const removeOutputs = [];
    Object.keys(infoNode.outputs[output_class].connections).map(function(key, index) {
      const id_input = infoNode.outputs[output_class].connections[index].node;
      const input_class = infoNode.outputs[output_class].connections[index].output;
      removeOutputs.push({id, id_input, output_class, input_class})
    })
    // Remove connections
    removeOutputs.forEach((item, i) => {
      this.removeSingleConnection(item.id, item.id_input, item.output_class, item.input_class);
    });

    delete this.drawflow.drawflow[moduleName].data[id].outputs[output_class];

    // Update connection
    const connections = [];
    const connectionsOuputs = this.drawflow.drawflow[moduleName].data[id].outputs
    Object.keys(connectionsOuputs).map(function(key, index) {
      connections.push(connectionsOuputs[key]);
    });
    this.drawflow.drawflow[moduleName].data[id].outputs = {};
    const output_class_id = output_class.slice(7);
    let nodeUpdates = [];
    connections.forEach((item, i) => {
      item.connections.forEach((itemx, f) => {
        nodeUpdates.push({ node: itemx.node, output: itemx.output });
      });
      this.drawflow.drawflow[moduleName].data[id].outputs['output_'+ (i+1)] = item;
    });
    nodeUpdates =  new Set(nodeUpdates.map(e => JSON.stringify(e)));
    nodeUpdates = Array.from(nodeUpdates).map(e => JSON.parse(e));

    nodeUpdates.forEach((itemx, i) => {
      this.drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections.forEach((itemz, g) => {
          if(itemz.node == id) {
            const input_id = itemz.input.slice(7);
            if(parseInt(output_class_id) < parseInt(input_id)) {
              if(this.module === moduleName) {

                const ele = this.container.querySelector(".connection.node_in_node-"+itemx.node+".node_out_node-"+id+".output_"+input_id+"."+itemx.output);
                ele.classList.remove('output_'+input_id);
                ele.classList.remove(itemx.output);
                ele.classList.add('output_'+(input_id-1));
                ele.classList.add(itemx.output);
              }
              if(itemz.points) {
                  this.drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections[g] = { node: itemz.node, input: 'output_'+(input_id-1), points: itemz.points }
              } else {
                  this.drawflow.drawflow[moduleName].data[itemx.node].inputs[itemx.output].connections[g] = { node: itemz.node, input: 'output_'+(input_id-1)}
              }
            }
          }
      });
    });

    this.updateConnectionNodes('node-'+id);
  }

  removeNodeId(id) {
    this.removeConnectionNodeId(id);
    var moduleName = this.getModuleFromNodeId(id.slice(5))
    if(this.module === moduleName) {
      this.container.querySelector(`#${id}`).remove();
    }
    delete this.drawflow.drawflow[moduleName].data[id.slice(5)];
    this.dispatch('nodeRemoved', id.slice(5));
  }

  removeConnection() {
    if(this.connection_selected != null) {
      const getClassStartsWith = (classStart) => [...this.connection_selected.parentElement.classList].find(c=>c.startsWith(classStart));
      this.connection_selected.parentElement.remove();
      //console.log(listclass);
      var index_out = this.drawflow.drawflow[this.module].data[getClassStartsWith("node_out_node-").slice(14)].outputs[getClassStartsWith("output_")].connections.findIndex(function(item,i) {
        return item.node === getClassStartsWith("node_in_node-").slice(13) && item.output === getClassStartsWith("input_")
      });
      this.drawflow.drawflow[this.module].data[getClassStartsWith("node_out_node-").slice(14)].outputs[getClassStartsWith("output_")].connections.splice(index_out,1);

      var index_in = this.drawflow.drawflow[this.module].data[getClassStartsWith("node_in_node-").slice(13)].inputs[getClassStartsWith("input_")].connections.findIndex(function(item,i) {
        return item.node === getClassStartsWith("node_out_node-").slice(14) && item.input === getClassStartsWith("output_")
      });
      this.drawflow.drawflow[this.module].data[getClassStartsWith("node_in_node-").slice(13)].inputs[getClassStartsWith("input_")].connections.splice(index_in,1);
      this.dispatch('connectionRemoved', { output_id: getClassStartsWith("node_out_node-").slice(14), input_id: getClassStartsWith("node_in_node-").slice(13), output_class: getClassStartsWith("output_"), input_class: getClassStartsWith("input_") } );
      this.connection_selected = null;
    }
  }

  removeSingleConnection(id_output, id_input, output_class, input_class) {
    var nodeOneModule = this.getModuleFromNodeId(id_output);
    var nodeTwoModule = this.getModuleFromNodeId(id_input);
    if(nodeOneModule === nodeTwoModule) {
      // Check nodes in same module.

      // Check connection exist
      var exists = this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.findIndex(function(item,i) {
        return item.node == id_input && item.output === input_class
      });
      if(exists > -1) {

        if(this.module === nodeOneModule) {
          // In same module with view.
          this.container.querySelector('.connection.node_in_node-'+id_input+'.node_out_node-'+id_output+'.'+output_class+'.'+input_class).remove();
        }

        var index_out = this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.findIndex(function(item,i) {
          return item.node == id_input && item.output === input_class
        });
        this.drawflow.drawflow[nodeOneModule].data[id_output].outputs[output_class].connections.splice(index_out,1);

        var index_in = this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.findIndex(function(item,i) {
          return item.node == id_output && item.input === output_class
        });
        this.drawflow.drawflow[nodeOneModule].data[id_input].inputs[input_class].connections.splice(index_in,1);

        this.dispatch('connectionRemoved', { output_id: id_output, input_id: id_input, output_class:  output_class, input_class: input_class});
        return true;

      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  removeConnectionNodeId(id) {
    const idSearchIn = 'node_in_'+id;
    const idSearchOut = 'node_out_'+id;

    const elemsOut = this.container.querySelectorAll(`.${idSearchOut}`);
    for(var i = elemsOut.length-1; i >= 0; i--) {
      const getClassStartsWith = (classStart) => [...elemsOut[i].classList].find(c=>c.startsWith(classStart));

      var index_in = this.drawflow.drawflow[this.module].data[getClassStartsWith("node_in_node-").slice(13)].inputs[getClassStartsWith("input_")].connections.findIndex(function(item,i) {
        return item.node === getClassStartsWith("node_out_node-").slice(14) && item.input === getClassStartsWith("output_")
      });
      this.drawflow.drawflow[this.module].data[getClassStartsWith("node_in_node-").slice(13)].inputs[getClassStartsWith("input_")].connections.splice(index_in,1);

      var index_out = this.drawflow.drawflow[this.module].data[getClassStartsWith("node_out_node-").slice(14)].outputs[getClassStartsWith("output_")].connections.findIndex(function(item,i) {
        return item.node === getClassStartsWith("node_in_node-").slice(13) && item.output === getClassStartsWith("input_")
      });
      this.drawflow.drawflow[this.module].data[getClassStartsWith("node_out_node-").slice(14)].outputs[getClassStartsWith("output_")].connections.splice(index_out,1);

      elemsOut[i].remove();

      this.dispatch('connectionRemoved', { output_id: getClassStartsWith("node_out_node-").slice(14), input_id: getClassStartsWith("node_in_node-").slice(13), output_class: getClassStartsWith("output_"), input_class: getClassStartsWith("input_") } );
    }

    const elemsIn = this.container.querySelectorAll(`.${idSearchIn}`);
    for(var i = elemsIn.length-1; i >= 0; i--) {
      const getClassStartsWith = (classStart) => [...elemsIn[i].classList].find(c=>c.startsWith(classStart));

      var index_out = this.drawflow.drawflow[this.module].data[getClassStartsWith("node_out_node-").slice(14)].outputs[getClassStartsWith("output_")].connections.findIndex(function(item,i) {
        return item.node === getClassStartsWith("node_in_node-").slice(13) && item.output === getClassStartsWith("input_")
      });
      this.drawflow.drawflow[this.module].data[getClassStartsWith("node_out_node-").slice(14)].outputs[getClassStartsWith("output_")].connections.splice(index_out,1);

      var index_in = this.drawflow.drawflow[this.module].data[getClassStartsWith("node_in_node-").slice(13)].inputs[getClassStartsWith("input_")].connections.findIndex(function(item,i) {
        return item.node === getClassStartsWith("node_out_node-").slice(14) && item.input === getClassStartsWith("output_")
      });
      this.drawflow.drawflow[this.module].data[getClassStartsWith("node_in_node-").slice(13)].inputs[getClassStartsWith("input_")].connections.splice(index_in,1);

      elemsIn[i].remove();

      this.dispatch('connectionRemoved', { output_id: getClassStartsWith("node_out_node-").slice(14), input_id: getClassStartsWith("node_in_node-").slice(13), output_class: getClassStartsWith("output_"), input_class: getClassStartsWith("input_") } );
    }
  }

  getModuleFromNodeId(id) {
    var nameModule;
    const editor = this.drawflow.drawflow
    Object.keys(editor).map(function(moduleName, index) {
      Object.keys(editor[moduleName].data).map(function(node, index2) {
        if(node == id) {
          nameModule = moduleName;
        }
      })
    });
    return nameModule;
  }

  addModule(name) {
    this.drawflow.drawflow[name] =  { "data": {} };
    this.dispatch('moduleCreated', name);
  }
  changeModule(name) {
    this.dispatch('moduleChanged', name);
    this.module = name;
    this.precanvas.innerHTML = "";
    this.canvas_x = 0;
    this.canvas_y = 0;
    this.pos_x = 0;
    this.pos_y = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.zoom = 1;
    this.zoom_last_value = 1;
    this.precanvas.style.transform = '';
    this.import(this.drawflow, false);
  }

  removeModule(name) {
    if(this.module === name) {
      this.changeModule('Home');
    }
    delete this.drawflow.drawflow[name];
    this.dispatch('moduleRemoved', name);
  }

  clearModuleSelected() {
    this.precanvas.innerHTML = "";
    this.drawflow.drawflow[this.module] =  { "data": {} };
  }

  clear () {
    this.precanvas.innerHTML = "";
    this.drawflow = { "drawflow": { "Home": { "data": {} }}};
  }
  export () {
    const dataExport = JSON.parse(JSON.stringify(this.drawflow));
    this.dispatch('export', dataExport);
    return dataExport;
  }

  import (data, notifi = true) {
    this.clear();
    this.drawflow = JSON.parse(JSON.stringify(data));
    this.load();
    if(notifi) {
      this.dispatch('import', 'import');
    }
  }

  /* Events */
  on (event, callback) {
       // Check if the callback is not a function
       if (typeof callback !== 'function') {
           console.error(`The listener callback must be a function, the given type is ${typeof callback}`);
           return false;
       }
       // Check if the event is not a string
       if (typeof event !== 'string') {
           console.error(`The event name must be a string, the given type is ${typeof event}`);
           return false;
       }
       // Check if this event not exists
       if (this.events[event] === undefined) {
           this.events[event] = {
               listeners: []
           }
       }
       this.events[event].listeners.push(callback);
   }

   removeListener (event, callback) {
      // Check if this event not exists

      if (!this.events[event]) return false

      const listeners = this.events[event].listeners
      const listenerIndex = listeners.indexOf(callback)
      const hasListener = listenerIndex > -1
      if (hasListener) listeners.splice(listenerIndex, 1)
   }

   dispatch (event, details) {
       // Check if this event not exists
       if (this.events[event] === undefined) {
           // console.error(`This event: ${event} does not exist`);
           return false;
       }
       this.events[event].listeners.forEach((listener) => {
           listener(details);
       });
   }

    getUuid() {
        // http://www.ietf.org/rfc/rfc4122.txt
        var s = [];
        var hexDigits = "0123456789abcdef";
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
        s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[8] = s[13] = s[18] = s[23] = "-";

        var uuid = s.join("");
        return uuid;
    }
    
}

const isOutputCompatible = (inType, outType) => {
  return (inType === outType)
      || (outType == "EXECLOOP" && inType=="EXEC")
      || (outType != "EXEC" && outType != "EXECLOOP" && (
          (inType === "ANY" && !outType.endsWith("_ARR"))
          || (inType === "ALL")
          || (inType === "ANY_ARR" && outType.endsWith("_ARR"))
      ));
}

const isOutputFreeOrMultiple = (connections,outType) => {
  return connections.length==0 || outType === "EXEC" || outType == "EXECLOOP";
}