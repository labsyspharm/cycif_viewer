(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.rainbow = factory());
}(this, function () { 'use strict';

	function rainbow (){
	    let pickerSize = 120,
			container, 
			pickerGroup,
	        huePickerElm,
			hueHandleElm,
			slPickerElm,
			slHandleElm,
	        inputElm,
	        handleSize = 15,
	        barThickness = 8,
			hueScale = d3.scaleLinear().domain([0,pickerSize]).range([0,360]).clamp(true),
			//(t)=>d3.hsl(t * 360, 1, 0.5) + ""),
			satScale = d3.scaleLinear().domain([0,pickerSize]).range([0, 1]).clamp(true),
			lumScale = d3.scaleLinear().domain([pickerSize, 0]).range([0, 1]).clamp(true),
			hue=360, sat=0.5, lum=0.5,
			gradient = 'linear-gradient(180deg,red,#ff0,#0f0,#0ff,#00f,#f0f,red)',
			hueDrag = d3.drag()
	        .on("drag", (e)=>{
	            hueHandleMoved(e.y);
	        })
	        .on("end", (e)=>{
	            hueHandleEnd(e.y);
			}),
			slDrag = d3.drag()
	        .on("drag", (e)=>{
	            slHandleMoved(e);
	        })
	        .on("end", (e)=>{
	            slHandleEnd(e);
			}),
			drag = d3.drag()
				.on("drag", (e)=>{
					let dx = e.dx;
					let dy = e.dy;
					container
					.style('left', parseInt(container.style('left'), 10) + dx+'px')
					.style('top', parseInt(container.style('top'), 10) + dy+'px');
				}),
	        listeners = d3.dispatch('handlemove', 'handleend', 'save', 'close');
	        
	    function picker(selection){
	        
	        container = selection.select('.picker-container');
	        if (container.empty()){
	            container = selection.append('div')
	                .attr('class', 'picker-container')
	                .style('position', 'fixed')
	                .style('padding', '10px')
	                .style('padding-left', '15px')
	                .style('border-radius', '4px')
	                .style('box-shadow', '0px 1px 3px 0px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 2px 1px -1px rgba(0,0,0,0.12)')
	                .style('transform', 'translate(-50%,10px)')
	                .style('background-color', '#fff')
					.style('z-index', '999')
					.call(drag);
	                // .style('align-items', 'center');
				pickerGroup = container.append('div')
					.attr("class", "picker-group")
					.style("display", "flex");


				// saturation and luminance picker
				let slPickerGroup = pickerGroup.append('div')
					.attr("class", "sl-picker")
					.style('position', 'relative');
				
				slPickerElm = slPickerGroup.append("div")
					.style("width", `${pickerSize}px`)
					.style("height", `${pickerSize}px`)
					.style("border", '1px solid #eeeee')
					.style('background-color', d3.hsl(hue, 1.0, 0.5))
					.style("background-image", "linear-gradient(180deg, white, rgba(255,255,255,0) 50%),linear-gradient(0deg, black, rgba(0,0,0,0) 50%),linear-gradient(90deg, gray, rgba(128,128,128,0))")
					// .style("background", slGradient(d3.hsl(hue, 1.0, 0.5)))
					.on('click', clickSlArea);
					
				slHandleElm = slPickerGroup.append('div')
					.attr('class', 'sl-picker-handle')
					.style('cursor', 'pointer')
					.style('position', 'absolute')
					.style('transform', 'translate(-50%,-50%)')
	                .style('width', `${handleSize}px`)
					.style('height', `${handleSize}px`)
					.style('top', `${lumScale.invert(lum)}px`)
					.style('left', `${satScale.invert(sat)}px`)
					.style('border-radius', '50%')
					.style('background-color', d3.hsl(hue, sat, lum))
					.style('border', '2px solid white')
					.call(slDrag);

				// hue picker
				huePickerElm = pickerGroup.append('div')
				.attr('class', 'hue-picker')
				.style("margin-left", "12px")
				.style('position', 'relative')
				.style('height', `${pickerSize}px`);

				huePickerElm.append('div')
					.attr('class', 'hue-picker-bar')
					.style('height', '100%')
					.style('width', `${barThickness}px`)
					.style('border-radius', '4px')
					.style('background', gradient)
					.on('click', clickHueBar);

				hueHandleElm = huePickerElm.append('div')
					.attr('class', 'hue-picker-handle')
					.style('cursor', 'pointer')
					.style('position', 'absolute')
					.style('transform', 'translate(-50%,-50%)')
					.style('left', '50%')
					.style('top', `${hueScale.invert(hue)}px`)
					.style('width', `${handleSize}px`)
					.style('height', `${handleSize}px`)
					.style('border-radius', '50%')
					.style('background-color', d3.hsl(hue, 1.0, 0.5))
					.style('border', '2px solid white')
					.call(hueDrag);

				let bottomGroup = container.append('div')
					.style('display', 'flex')
					.style('margin-top', '10px');
				inputElm = bottomGroup.append('input')
					.style("width", `${pickerSize-25}px`)
					.style('outline', 'none')
					.style('border', 'none')
					.style('color', '#757575')
					.style('font-size', '12px')
					.style('border-radius', '4px')
					.style('background', '#eeeeee')
					.attr('spellcheck', 'false')
					.attr('value', d3.hsl(hue, sat, lum))
					.on('input', textChanged);

				bottomGroup.append('div')
	                .attr('class', 'save')
					.style('cursor', 'pointer')
					.style('text-align', 'center')
	                // .style('font-family', 'Arial, Helvetica, sans-serif')
	                .style('border-radius', '50%')
	                // .style('font-size', '12px')
	                .style('margin-left', '5px')
					.style('width', '24px')
					.style('height', '24px')
					.style('background-repeat', 'no-repeat')
					.style('background-image','url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDUxMS45OTkgNTExLjk5OSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTExLjk5OSA1MTEuOTk5OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIGNsYXNzPSIiPjxnPjxnPgoJPGc+CgkJPHBhdGggZD0iTTUwNi4yMzEsNzUuNTA4Yy03LjY4OS03LjY5LTIwLjE1OC03LjY5LTI3Ljg0OSwwbC0zMTkuMjEsMzE5LjIxMUwzMy42MTcsMjY5LjE2M2MtNy42ODktNy42OTEtMjAuMTU4LTcuNjkxLTI3Ljg0OSwwICAgIGMtNy42OSw3LjY5LTcuNjksMjAuMTU4LDAsMjcuODQ5bDEzOS40ODEsMTM5LjQ4MWM3LjY4Nyw3LjY4NywyMC4xNiw3LjY4OSwyNy44NDksMGwzMzMuMTMzLTMzMy4xMzYgICAgQzUxMy45MjEsOTUuNjY2LDUxMy45MjEsODMuMTk4LDUwNi4yMzEsNzUuNTA4eiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojOUU5RTlFIiBkYXRhLW9sZF9jb2xvcj0iIzllOWU5ZSI+PC9wYXRoPgoJPC9nPgo8L2c+PC9nPiA8L3N2Zz4=)')
					.style('background-size', '12px')
					.style('background-position', 'center')
	                .on('mouseenter',function(){
	                    d3.select(this).style('background-color', '#eee');
	                })
	                .on('mouseleave',function(){
	                    d3.select(this).style('background-color', null);
	                })
					.on('click', pickersave);
					
				bottomGroup.append('div')
	                .attr('class', 'close')
					.style('cursor', 'pointer')
					.style('text-align', 'center')
	                // .style('font-family', 'Arial, Helvetica, sans-serif')
	                .style('border-radius', '50%')
	                // .style('font-size', '12px')
	                .style('margin-left', '5px')
					.style('width', '24px')
					.style('height', '24px')
					.style('background-repeat', 'no-repeat')
					.style('background-image','url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4PSIwcHgiIHk9IjBweCIgdmlld0JveD0iMCAwIDUxMi4wMDEgNTEyLjAwMSIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNTEyLjAwMSA1MTIuMDAxOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiPjxnPjxnPgoJPGc+CgkJPHBhdGggZD0iTTUwNS45MjIsNDc2LjU2N0wyODUuMzU1LDI1Nkw1MDUuOTIsMzUuNDM1YzguMTA2LTguMTA1LDguMTA2LTIxLjI0OCwwLTI5LjM1NGMtOC4xMDUtOC4xMDYtMjEuMjQ4LTguMTA2LTI5LjM1NCwwICAgIEwyNTYuMDAxLDIyNi42NDZMMzUuNDM0LDYuMDgxYy04LjEwNS04LjEwNi0yMS4yNDgtOC4xMDYtMjkuMzU0LDBjLTguMTA2LDguMTA1LTguMTA2LDIxLjI0OCwwLDI5LjM1NEwyMjYuNjQ2LDI1Nkw2LjA4LDQ3Ni41NjcgICAgYy04LjEwNiw4LjEwNi04LjEwNiwyMS4yNDgsMCwyOS4zNTRjOC4xMDUsOC4xMDUsMjEuMjQ4LDguMTA2LDI5LjM1NCwwbDIyMC41NjctMjIwLjU2N2wyMjAuNTY3LDIyMC41NjcgICAgYzguMTA1LDguMTA1LDIxLjI0OCw4LjEwNiwyOS4zNTQsMFM1MTQuMDI4LDQ4NC42NzMsNTA1LjkyMiw0NzYuNTY3eiIgZGF0YS1vcmlnaW5hbD0iIzAwMDAwMCIgY2xhc3M9ImFjdGl2ZS1wYXRoIiBzdHlsZT0iZmlsbDojOUU5RTlFIiBkYXRhLW9sZF9jb2xvcj0iIzllOWU5ZSI+PC9wYXRoPgoJPC9nPgo8L2c+PC9nPiA8L3N2Zz4=)')
					.style('background-size', '12px')
					.style('background-position', 'center')
	                .on('mouseenter',function(){
	                    d3.select(this).style('background-color', '#eee');
	                })
	                .on('mouseleave',function(){
	                    d3.select(this).style('background-color', null);
	                })
	                .on('click', pickerclose);
	        }
	        huePickerElm.style('height', `${pickerSize}px`);

	        hueHandleElm.style('width', `${handleSize}px`)
	            .style('height', `${handleSize}px`);

	        let initY = parseInt(hueHandleElm.style('top'));
	        updateHueHandle(initY);
	    }
	    picker.pickerSize = function(value) {
	        if (!arguments.length) return pickerSize;
	        pickerSize = value;
	        return picker;
	    };
	    picker.handleSize = function(value) {
	        if (!arguments.length) return handleSize;
	        handleSize = value;
	        return picker;
	    };
	    picker.barThickness = function(value) {
	        if (!arguments.length) return barThickness;
	        barThickness = value;
	        return picker;
	    };
	    picker.on = function() {
	        var value = listeners.on.apply(listeners, arguments);
	        return value === listeners ? picker : value;
	    };
	    picker.show  = function(x,y){
	        container.style('display', null)
	            .style('left', x+'px')
	            .style('top', y+'px');
	    };
	    picker.hide  = function(){
	        container.style('display', 'none');
	    };
	    picker.set = function(hsl){
			let sl = {
				x:satScale.invert(hsl.s?hsl.s:sat),
				y:lumScale.invert(hsl.l)
			};
			updateHueHandle(hueScale.invert(hsl.h?hsl.h:hue));
			updateSlHandle(sl);

	        // if (hsl.l==0){
	        //     // hueHandleElm.style('display', 'none');
	        //     // blackElm.style('width', `${handleSize}px`)
	        //     // .style('height', `${handleSize}px`)
	        // }else{
	        //     let x = pickerSize*hsl.h/360;
	        //     x = x<0? 0: (x>pickerSize?pickerSize:x);
	        //     hueHandleElm.style('background-color', hsl.toString());

	        //     // blackElm.style('width', `${1.2*barThickness}px`)
	        //     // .style('height', `${1.2*barThickness}px`)
	        // }
	    };
	    // function reset(){
	    //     picker.set(d3.hsl('black'));
	    //     listeners.apply("handleend", this, [d3.hsl('black').toString(),null,...arguments]);
		// }
		function textChanged(){
			let hsl = d3.hsl(this.value);
			let sl = {
				x:satScale.invert(hsl.s?hsl.s:sat),
				y:lumScale.invert(hsl.l)
			};
			updateHueHandle(hueScale.invert(hsl.h?hsl.h:hue), true);
			updateSlHandle(sl, true);
			listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),...arguments]);
		}
		function pickerclose(){
	        picker.hide();
			listeners.apply("close", this, [d3.hsl(hue, sat, lum),...arguments]);
		}
		function pickersave(){
			picker.hide();
	        listeners.apply("save", this, [d3.hsl(hue, sat, lum),...arguments]);
		}
	    function clickHueBar(e){
			let loc = d3.pointer(e)[1];
	        updateHueHandle(loc);
	        listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
		}
		function clickSlArea(e){
			let loc = d3.pointer(e);
			loc = {x:loc[0], y:loc[1]};
			updateSlHandle(loc);
	        listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,'sl',...arguments]);
	    }
	    function hueHandleMoved(loc){
			updateHueHandle(loc);
	        listeners.apply("handlemove", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
	    }
	    function hueHandleEnd(loc){
	        updateHueHandle(loc);
	        listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,'hue',...arguments]);
		}
		function slHandleMoved(loc){
			updateSlHandle(loc);
			listeners.apply("handlemove", this, [d3.hsl(hue, sat, lum),loc,'sl',...arguments]);
		}
		function slHandleEnd(loc){
			updateSlHandle(loc);
			listeners.apply("handleend", this, [d3.hsl(hue, sat, lum),loc,'sl',...arguments]);
		}
	    function updateHueHandle(loc, dontUpdateText=false){
			hue = hueScale(loc);

			hueHandleElm.style('top', `${hueScale.invert(hue)}px`)
				.style('background-color', d3.hsl(hue, 1.0, 0.5));

			slPickerElm.style('background-color', d3.hsl(hue, 1.0, 0.5));

			slHandleElm.style('background-color', d3.hsl(hue, sat, lum));
			if (!dontUpdateText){
				inputElm.node().value = d3.hsl(hue, sat, lum);
			}
		}
		function updateSlHandle(loc, dontUpdateText=false){
			sat = satScale(loc.x);
			lum = lumScale(loc.y);

			slHandleElm
				.style('display', null)
				.style('top', `${lumScale.invert(lum)}px`)
				.style('left', `${satScale.invert(sat)}px`)
				.style('background-color', d3.hsl(hue, sat, lum));
			if (!dontUpdateText){
				// inputElm.attr('value', d3.hsl(hue, sat, lum));
				inputElm.node().value = d3.hsl(hue, sat, lum);
				// console.log(inputElm.attr('value'), inputElm.node().value);
				// inputElm.node().setAttribute('value', inputElm.node().value);
			}
			
		}
	    return picker;
	}

	return rainbow;

}));
