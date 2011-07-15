var IsFirstRun = false;
var actual_on = 'None';

$(main);

function SetProgressbarCaption()
{
	$("#ProgressBarCaption")[0].innerHTML = IsFirstRun ? "Creating CSV report...&nbsp;&nbsp" : "&nbsp;&nbsp;Updating...&nbsp;&nbsp;";
}

function UpdateCsvLinkTitle()
{
	$('#GenerateReportLink')[0].innerHTML = IsFirstRun ? "Create CSV report" : "&nbsp;Update";	
}

function TemplateApplied()
{
	$("#ProgressBar").progressbar({ value: 1 });
	$('#DownloadReportLink').attr('href','/active_users_report_csv/download?url='+currentScope)
		

	UserActionsCsvStatus(function (data) {
		
		if ((data.actual_on == '0')||(data.actual_on == 'None')) {
			IsFirstRun = true;
		}
			
		SetProgressbarCaption();
		
		$('#GenerateReportLink').click(function(e){
			CreateCSVReport(e);
		});				
		
		UpdateCsvLinkTitle();
		UpdateCsvReportActualOn(data);
		if(data['busy']){
			$('#GenerateReport').hide();
			$("#ProgressBar").progressbar('option','value',data['progress']);
			UpdateCsvProgressBar();
			$("#ProgressBarBlock").show();
		}
	});	
	ReloadReportAndDisplay();
	$(document).trigger('MainFinished');
}

function main()
{
	$.ajaxSetup({ cache: false });
	$('#ActiveUsersReportInner').load('static/html/active_users_report_inner.html', TemplateApplied);
};

function CreateCSVReport(e){
	e.preventDefault();			
	UserActionsCsvExecute(function() {			
		StartCsvProgressBar();
	});
};

function UserActionsData(onFinished) {	
	$.getJSON(
		'/active_users_report/data/?url=' + currentScope,  
		onFinished
	);
}

function UserActionsCsvExecute(onFinished) {	
	$.getJSON(
		'/active_users_report_csv/execute/?url=' + currentScope,		
		onFinished
	);
}

function UserActionsCsvStatus(onFinished) {	
	$.getJSON(
		'/active_users_report_csv/status/?url=' + currentScope, 
		onFinished
	);
}

function UpdateCsvProgressBar() {		
	UserActionsCsvStatus(function (data) {					
			if(data['busy']){
				SetProgressbarCaption();
				$("#ProgressBar").progressbar('option','value',data['progress']);			
				setTimeout(UpdateCsvProgressBar, 1000);
			} else {
				IsFirstRun = false;
				FinishProgressBar(data);
			}
		}
	);		
}


function UserActionsState(onFinished) {	
	$.getJSON(
		'/active_users_report/state/?url=' + currentScope + '&actual_on=' + actual_on,
		onFinished
	);
}

function ReloadReportAndDisplay() {
	UserActionsData(
		function(data) {					
			DisplayData(data);	
			var isBusy = true;
			function check_busy(result) {
				isBusy = result['busy'];
				if ( isBusy == true ) {					
					setTimeout( function() { UserActionsState(check_busy); } , 1000 );
					return;
				};
				
				UserActionsData(function(data){ 					
					$(document).trigger('BeforeDisplayActualData');
					DisplayData(data);
					$('#UpdateAnimationBlock').hide();
					$(document).trigger('PageReloaded');
				});
			};
			UserActionsState( check_busy);			
		}			
	);		
}

function GetMax(activity,field){
	var max = 0;
	for (var i in activity) {
		cur_views = activity[i][field]
		if (cur_views > max){
			max = cur_views
		}
	}
	return max
}
	
function DisplayData(data) {
	actual_on = data['actual_on'];
	actual_on_disp = data['actual_on_disp'];
	activity = data['active_users']

	if (activity != null){

		var ActionTemplate = $.template(unescape($("#ItemTemplate:first").html())); //template for whole record
		$("#ActionsList > .ListItem").remove(); //remove all list
		$.tmpl(ActionTemplate, activity).appendTo("#ActionsList" );	
		
		var max_views = GetMax(activity,'total_views');
		var max_users = GetMax(activity,'total_users');
			
		$(".ListItem").each(function(){
			var cur_action = $(this);
			var list_item_idx = cur_action.index()
			

				var cur_data = activity[list_item_idx];
				if (cur_data != null){
					var views_bar_length = 0
					var users_bar_length = 0
					if(max_views != 0){
						views_bar_length = 75 * cur_data['total_views'] / max_views;
					}
					if(max_users != 0){
						users_bar_length = 75 * cur_data['total_users'] / max_users;
					}
					cur_action.find('.InnerColumnBarViews').css('width', views_bar_length +'%');
					cur_action.find('#ViewsBarData').css('width', (99 - views_bar_length)+'%');
					cur_action.find('.InnerColumnBarUsers').css('width', users_bar_length +'%');
					cur_action.find('#UsersBarData').css('width', (99 - users_bar_length)+'%');
				}

		})

		$("#ActionsList > li").addClass(
			function() { return ($(this).index() %2 == 0) ? 'odd' : false; }
		);
	}
	if ((actual_on_disp != '0')&&(actual_on_disp != 'None')) {				
		var x = $('#reportAcualOnValue')[0];
		x.innerHTML=actual_on_disp;
		$('#ActionsStatus').show();
		$(document).trigger('ActionShowed');	
	}

	var errors = data['errors'];
	if ( typeof errors != 'undefined' && errors &&  errors.length > 0 ) {
		$('#errors').load('static/html/errors.tpl.html', function(response, status, xhr){
			$("#ErrorsList > .ErrorItem").remove();
			var tp = $("#ErrorItemTemplate:first")
			if (tp.length > 0 ){
				var template = $.template(unescape($("#ErrorItemTemplate:first").html()));
				$.tmpl(template, errors).appendTo("#ErrorsList");
				$(document).trigger('ErrorsShowed');
			}
		});
	}
	else
	{
		$("#ErrorsData").remove()
		$(document).trigger('ErrorsCleared');
	}
	
	
}

// to separate module:

function StartCsvProgressBar() {
	$('#GenerateReport').hide();
	$("#ProgressBar").progressbar({ value: 1 });
	$("#ProgressBarBlock").show();
	UpdateCsvProgressBar();
}

function FinishProgressBar(data) {
	$('#GenerateReport').hide();
	$('#DownloadReport').show();
	$("#ProgressBar").progressbar({ value: 1 });
	$("#ProgressBarBlock").hide();	
	UpdateCsvReportActualOn(data);
	$(document).trigger('ProgressBarFinished')	
}

function UpdateCsvReportActualOn(data) {
	$('#GenerateReport').show();
	if(!IsFirstRun) {				
		$('#DownloadReport').show();
		$('#csvReportActualOnValue')[0].innerHTML=data.actual_on;
		UpdateCsvLinkTitle();
		SetProgressbarCaption();
	}						
}
