
import { readFileSync,createReadStream } from 'fs';
import { EventEmitter } from 'events';
//import * as vscode from "vscode";
var vscode = require("vscode");

export interface MockBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

/**
 * A Mock runtime with minimal debugger functionality.
 */
export class MockRuntime extends EventEmitter {

	// the initial (and one and only) file we are 'debugging'
	private _sourceFile: string;
	public get sourceFile() {
		return this._sourceFile;
	}

	// the contents (= lines) of the one and only file
	private _sourceLines: string[];

	// This is the next line that will be 'executed'
	private _currentLine = 0;
	private _currentColumn: number | undefined;

	// maps from sourceFile to array of Mock breakpoints
	private _breakPoints = new Map<string, MockBreakpoint[]>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;

	private _breakAddresses = new Set<string>();

	private _noDebug = false;
	private _global_counter = 1;
	private contentLines: any = [];

	constructor() {
		super();
	}

	/**
	 * Start executing the given program.
	 */
	public start(program: string, stopOnEntry: boolean, noDebug: boolean) {
		//console.log("MR:start");
		this._noDebug = noDebug;

		this.loadSource(program);
		this._currentLine = -1;

		this.verifyBreakpoints(this._sourceFile);

		if (stopOnEntry) {
			// we step once
			this.step(false, 'stopOnEntry');
		} else {
			// we just start to run until we hit a breakpoint or an exception
			this.continue();
		}




		let i = 0;
		let debugProgram = this;



		function readLines(input, func) {
			var remaining = '';

			input.on('data', function(data) {
			  remaining += data;
			  var index = remaining.indexOf('\n');
			  while (index > -1) {
				var line = remaining.substring(0, index);
				remaining = remaining.substring(index + 1);
				func(line);
				index = remaining.indexOf('\n');
			  }
			});

			input.on('end', function() {

			if (remaining.length > 0) {
			func(remaining);
			}


			for(let i=1; i < debugProgram.contentLines.length; i++) {
				let kk: any = debugProgram.contentLines[i];
			//	console.log(kk.env);
			}

			debugProgram.setBreakPoint(debugProgram._sourceFile,debugProgram.contentLines[debugProgram._global_counter].span.start_line);

			});
		  }

		  function func(data) {
			debugProgram.contentLines[++i] = JSON.parse(data);
		  }


		  var input = createReadStream(vscode.workspace.rootPath + "/meta_debug_with_stack.ctc");
		  readLines(input, func);







		// for(let i=0; i < debug_obj.length; i++) {
		// 	console.log(debug_obj[i]);
		// }
		// for(let i=0; i < contentLines.length; i++) {
		// 	try {
		// 		JSON.parse((contentLines[i]));
		// 	} catch (e) {
		// 		console.log(e);
		// 		return;
		// 	}
		// }


	}

	/**
	 * Continue execution to the end/beginning.
	 */
	// public continueold(reverse = false) {
	// 	console.log("MR:continue");
	// 	this.run(reverse, undefined);
	// }

	public continue(reverse = false){
	//	this.setBreakPoint(this._sourceFile,this.contentLines[++this._global_counter].span.start_line);
		if(!reverse){
			if(this._global_counter >= this.contentLines.length) {
				this.sendEvent('end');
			}
			this._currentLine = (this.contentLines[++this._global_counter].span.start_line - 1);

		} else {
			if(this._global_counter > 1){
				this._currentLine = (this.contentLines[--this._global_counter].span.start_line - 1);
			} else {
				if(this._global_counter <= 0) {
					this.sendEvent('end');
				}
				this._currentLine = (this.contentLines[this._global_counter].span.start_line - 1);
			}
		}
		this._currentColumn = this.contentLines[this._global_counter].span.start_column;;
		this.sendEvent('stopOnBreakpoint');
		//console.log("line number " , this.contentLines[this._global_counter].span.start_line,this._global_counter);
		//console.log("column number " , this.contentLines[this._global_counter].span.start_column);
	}

	/**
	 * Step to the next/previous non empty line.
	 */
	public step(reverse = false, event = 'stopOnStep') {
		//console.log("MR:reverse",event);
		this.run(reverse, event);
	}

	/**
	 * "Step into" for Mock debug means: go to next character
	 */
	public stepIn(targetId: number | undefined) {
		//console.log("MR:stepIn");
		// if (typeof targetId === 'number') {
		// 	this._currentColumn = targetId;
		// 	this.sendEvent('stopOnStep');
		// } else {
		// 	if (typeof this._currentColumn === 'number') {
		// 		if (this._currentColumn <= this._sourceLines[this._currentLine].length) {
		// 			this._currentColumn += 1;
		// 		}
		// 	} else {
		// 		this._currentColumn = 1;
		// 	}
		// 	this.sendEvent('stopOnStep');
		// }
	}

	/**
	 * "Step out" for Mock debug means: go to previous character
	 */
	public stepOut() {
		//console.log("MR:stepOut");
		// if (typeof this._currentColumn === 'number') {
		// 	this._currentColumn -= 1;
		// 	if (this._currentColumn === 0) {
		// 		this._currentColumn = undefined;
		// 	}
		// }
		// this.sendEvent('stopOnStep');
	}

	public getStepInTargets(frameId: number): { id: number, label: string}[] {
		//console.log("MR:get Stepsin TArget");
		// const line = this._sourceLines[this._currentLine].trim();

		// // every word of the current line becomes a stack frame.
		// const words = line.split(/\s+/);

		// // return nothing if frameId is out of range
		// if (frameId < 0 || frameId >= words.length) {
		// 	return [];
		// }

		// // pick the frame for the given frameId
		// const frame = words[frameId];

		// const pos = line.indexOf(frame);

		// // make every character of the frame a potential "step in" target
		// return frame.split('').map((c, ix) => { return { id: pos + ix, label: `target: ${c}` }});
		return { id: 0,label:"string"}[0];
	}

	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	public stack(startFrame: number, endFrame: number): any {
		//console.log("MR:stack");
		const words = this._sourceLines[this._currentLine].trim().split(/\s+/);
		//let stackArray = this.contentLines[this._global_counter].context.stack;
		let stackArray = this.contentLines[this._global_counter].stack.stack;

		const frames = new Array<any>();
		// every word of the current line becomes a stack frame.
		for (let i = stackArray.length - 1; i >= 0; i--) {
//			const name = words[i];	// use a word of the line as the stackframe name

			const stackFrame: any = {
				index: i,
				name: stackArray[i].identifier,
				file: this._sourceFile,
				line: this._currentLine
			};
			if (typeof this._currentColumn === 'number') {
				stackFrame.column = this._currentColumn;
			}
			frames.push(stackFrame);
		}
		return {
			frames: frames,
			count: words.length
		};
	}

	public getBreakpoints(path: string, line: number): number[] {
		//console.log("MR:get BP");
		const l = this._sourceLines[line];

		let sawSpace = true;
		const bps: number[] = [];
		for (let i = 0; i < l.length; i++) {
			if (l[i] !== ' ') {
				if (sawSpace) {
					bps.push(i);
					sawSpace = false;
				}
			} else {
				sawSpace = true;
			}
		}

		return bps;
	}

	/*
	 * Set breakpoint in file with given line.
	 */
	public setBreakPoint(path: string, line: number) : MockBreakpoint {
		//console.log("MR:set BP");
		const bp = <MockBreakpoint> { verified: false, line, id: this._breakpointId++ };
		let bps = this._breakPoints.get(path);
		if (!bps) {
			bps = new Array<MockBreakpoint>();
			this._breakPoints.set(path, bps);
		}
		bps.push(bp);

		this.verifyBreakpoints(path);

		return bp;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number) : MockBreakpoint | undefined {
		//console.log("MR:cleat BP");
		let bps = this._breakPoints.get(path);
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		//console.log("MR:cleatr BPS");
		this._breakPoints.delete(path);
	}

	/*
	 * Set data breakpoint.
	 */
	public setDataBreakpoint(address: string): boolean {
		if (address) {
			this._breakAddresses.add(address);
			return true;
		}
		return false;
	}

	/*
	 * Clear all data breakpoints.
	 */
	public clearAllDataBreakpoints(): void {
		this._breakAddresses.clear();
	}

	// private methods

	private loadSource(file: string) {
		//console.log("MR:loadsource",this._sourceFile);
		if (this._sourceFile !== file) {
			this._sourceFile = file;
			this._sourceLines = readFileSync(this._sourceFile).toString().split('\n');
		}
	}

	/**
	 * Run through the file.
	 * If stepEvent is specified only run a single step and emit the stepEvent.
	 */
	private run(reverse = false, stepEvent?: string) {
		//console.log("MR:run");
		if (reverse) {
			for (let ln = this._currentLine-1; ln >= 0; ln--) {
				if (this.fireEventsForLine(ln, stepEvent)) {
					this._currentLine = ln;
					this._currentColumn = undefined;
					return;
				}
			}
			// no more lines: stop at first line
			this._currentLine = 0;
			this._currentColumn = undefined;
			this.sendEvent('stopOnEntry');
		} else {
			for (let ln = this._currentLine+1; ln < this._sourceLines.length; ln++) {
				if (this.fireEventsForLine(ln, stepEvent)) {
					this._currentLine = ln;
					this._currentColumn = undefined;
					return true;
				}
			}
			// no more lines: run to end
			this.sendEvent('end');
		}
	}

	public getVariables(){
		return this.contentLines[this._global_counter].context;
	}

	public getGlobalVariables(){
		return this.contentLines[this._global_counter].env;
	}

	private verifyBreakpoints(path: string) : void {
		//console.log("MR:verify BPs");
		if (this._noDebug) {
			return;
		}

		let bps = this._breakPoints.get(path);
		if (bps) {
			this.loadSource(path);
			bps.forEach(bp => {
				if (!bp.verified && bp.line < this._sourceLines.length) {
					const srcLine = this._sourceLines[bp.line].trim();

					// if a line is empty or starts with '+' we don't allow to set a breakpoint but move the breakpoint down
					if (srcLine.length === 0 || srcLine.indexOf('+') === 0) {
						bp.line++;
					}
					// if a line starts with '-' we don't allow to set a breakpoint but move the breakpoint up
					if (srcLine.indexOf('-') === 0) {
						bp.line--;
					}
					// don't set 'verified' to true if the line contains the word 'lazy'
					// in this case the breakpoint will be verified 'lazy' after hitting it once.
					if (srcLine.indexOf('lazy') < 0) {
						bp.verified = true;
						this.sendEvent('breakpointValidated', bp);
					}
				}
			});
		}
	}

	/**
	 * Fire events if line has a breakpoint or the word 'exception' is found.
	 * Returns true is execution needs to stop.
	 */
	private fireEventsForLine(ln: number, stepEvent?: string): boolean {

		if (this._noDebug) {
			return false;
		}

		const line = this._sourceLines[ln].trim();

		// if 'log(...)' found in source -> send argument to debug console
		const matches = /log\((.*)\)/.exec(line);
		if (matches && matches.length === 2) {
			this.sendEvent('output', matches[1], this._sourceFile, ln, matches.index)
		}

		// if a word in a line matches a data breakpoint, fire a 'dataBreakpoint' event
		const words = line.split(" ");
		for (let word of words) {
			if (this._breakAddresses.has(word)) {
				this.sendEvent('stopOnDataBreakpoint');
				return true;
			}
		}

		// if word 'exception' found in source -> throw exception
		if (line.indexOf('exception') >= 0) {
			this.sendEvent('stopOnException');
			return true;
		}

		// is there a breakpoint?
		const breakpoints = this._breakPoints.get(this._sourceFile);
		if (breakpoints) {
			const bps = breakpoints.filter(bp => bp.line === ln);
			if (bps.length > 0) {

				// send 'stopped' event
				this.sendEvent('stopOnBreakpoint');

				// the following shows the use of 'breakpoint' events to update properties of a breakpoint in the UI
				// if breakpoint is not yet verified, verify it now and send a 'breakpoint' update event
				if (!bps[0].verified) {
					bps[0].verified = true;
					this.sendEvent('breakpointValidated', bps[0]);
				}
				return true;
			}
		}

		// non-empty line
		if (stepEvent && line.length > 0) {
			this.sendEvent(stepEvent);
			return true;
		}

		// nothing interesting found -> continue
		return false;
	}

	private sendEvent(event: string, ... args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}