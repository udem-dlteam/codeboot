function bc_tutorial() {
    if (bc.inTutorial) return;
    bc.inTutorial = true;
    bc_tutorial1();
}

function bc_tutorial_setREPLExpression() {
    bc.cancel();
    bc.query("replay=1+2*3");
    bc.handle_query();
    focusREPL();
}

function bc_tutorial1() {
	$("#repl").popover({
		animation: true,
		placement: "bottom",
		trigger: "manual",
		title: "Console",
		content: '<p>This is the Console.  After the prompt, enter the JavaScript code you wish to execute.</p> ' +
		         '<p><a class="btn btn-primary" onclick="bc_tutorial_setREPLExpression();">Show me</a> ' +
		         '<a class="btn btn-primary" onclick="bc_tutorial2();">Next</a></p>',
		html: true,
	});

	$("#repl").popover('show');
    focusREPL();
}

function bc_tutorial2() {
    $("#repl").popover('destroy');
	$("#play-button").popover({
		animation: true,
		placement: "bottom",
		trigger: "manual",
		title: "Play button",
		content: '<p>Use this button to evaluate the code entered at the Console, or simply press the Enter key.</p>' +
		    '<p><a class="btn btn-primary" onclick="bc_tutorial_setREPLExpression();' + "setTimeout(function () { $('#play-button').click(); }, 100);" + '">Show me</a> ' +
			'<a class="btn btn-primary" onclick="bc_tutorial3();">Next</a></p>',
		html: true,
	});

	$("#play-button").popover('show');
    focusREPL();
}

function bc_tutorial3() {
    $("#play-button").popover('destroy');
	$("#step-button").popover({
		animation: true,
		placement: "bottom",
		trigger: "manual",
		title: "Step button",
		content: '<p>Use this button to execute one step of the code.</p>' +
		         '<p><a class="btn btn-primary" onclick="bc_tutorial_setREPLExpression();' + "setTimeout(function () { $('#step-button').click(); }, 100); bc_tutorial4();" + '">Show me</a>  ' +
		         '<a class="btn btn-primary" onclick="bc_tutorial_end();">Done</a></p>',
		html: true,
	});

	$("#step-button").popover('show');
    focusREPL();
}

function bc_tutorial4() {
    $("#step-button").popover('destroy');
	$("#step-button").popover({
		animation: false,
		placement: "bottom",
		trigger: "manual",
		title: "Step button",
		content: '<p>Press the button again to execute the next step. Repeat until the code is fully evaluated, or press the Play button.</p>' +
		         '<p><a class="btn btn-primary" onclick="bc_tutorial_end();">Done</a></p>',
		html: true,
	});

	$("#step-button").popover('show');
    focusREPL();
}

function bc_tutorial_end() {
	$("#step-button").popover('destroy');
    focusREPL();
    bc.inTutorial = false;
}
