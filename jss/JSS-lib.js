// JavaScript Search Engine Library
// Yann LeCun & Florin Nicsa, 2003
// DO NOT MODIFY unless you really know what you are doing

// associative array character codes to integers
var jss_piso = new Object;

// init function
function jss_piso_init() {
  // set of 186 printable non-escaped ISO-Latin characters
  jss_piso.charset = " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏĞÑÒÓÔÕÖ×ØÙÚÛÜİŞßàáâãäåæçèéêëìíîïğñòóôõö÷øùúûüış";
  jss_piso.nsymb = jss_piso.charset.length;
  // number of "direct" (one byte) codes
  jss_piso.ndirect = 170;
  // first character for non-direct code
  jss_piso.ofndirect = jss_piso.charset.charCodeAt(jss_piso.ndirect);
  // maximum codable delta between doc ids
  jss_piso.maxdelta = jss_piso.nsymb*(jss_piso.nsymb-1)+(jss_piso.nsymb-1)+jss_piso.ndirect;
  for (i=0; i<jss_piso.charset.length; i++) { jss_piso[jss_piso.charset.charCodeAt(i)]=i; } 
}

// decode a string into a list of document IDs
function jss_strtoids(str) {
 if (!str) { return -1; 
 } else {
   var r = new Array(str.length); 
   var id = -1; var p=0; var i=0;
   // fill up translation table if necessary
   if (!jss_piso.a) { jss_piso_init(); } 
   while ( i < str.length ) {
     c = str.charCodeAt(i); i++;
     if ( c == 32 ) {//space
       // two-byte offset
       msb = str.charCodeAt(i); i++;
       lsb = str.charCodeAt(i); i++;
       id += jss_piso.nsymb*jss_piso[msb] + jss_piso[lsb] + jss_piso.ndirect;
       r[p++] = id;
     } else if ( c >= jss_piso.ofndirect ) {
       // if the code is >= ndirect: code-ndirect+2 = number of successive ones
      for ( k=0; k< jss_piso[c]-jss_piso.ndirect+2; k++ ) { id++; r[p++] = id; }
     } else { 
       // normal code 1<x<ndirect-1
       id += jss_piso[c];
       r[p++] = id;
     }
   } 
   return r.slice(0,p);
 }
}

function jss_replace(S,s_match,s_replace) {
  s_start=0;
  while((s_start = S.indexOf(s_match,s_start)) > -1) {
    S = S.substr(0,s_start)+s_replace+S.substr(s_start+s_match.length);
    s_start = s_start+s_match;
  }
  return S;
}

function jss_word_cleanup(s) {
  s+=" ";
  if ((s.substr(0,1).match(/[A-Z]/)) || (s.length < 5))
    s=s.toLowerCase();
  else {
    s1=s.toLowerCase();
    do {
      s=s1;
      s1=s.replace(/([a-z]+)ties(\s+)/,"$1ty$2");
    } while(s1 != s);
    do {
      s=s1;
      s1=s.replace(/([a-z]+)(ing|ed|s)(\s+)/,"$1$3");
    } while(s1 != s);
  }
  return s.substr(0,s.length-1);
}

// -----------------------------------------
var nums;
var all_docs = new Array(doc_url.length);   
var default_result = new Array();
var is_start=0;
var op_str="";
var result_stack = new Array();
var polish_arr;
var is_first=0;
var Global_s;
var Search_words = new String();
var Stop_words = new String();
var test_arr = new Array();

 // this is the function that's called to generate a hit
//  jss_printhit(url,fr) { }

function search_in_array(num_array,num_val,last_pos) {
  i1=0;
  k1= last_pos;
  while (i1 < k1-1) {
    var temp=Math.floor((i1+k1)/2);
    if (num_array[temp] < num_val) i1=temp; else k1=temp;
  } 
  if (num_array[k1]>num_val) { return k1; } else { return k1+1; }
}

function docsids(searchval) {
  for(i=0;(i < jss_resultframe.wordlist.length) && (jss_resultframe.wordlist[i]!=searchval);i++);
  if (i< jss_resultframe.wordlist.length)
    return parent.searchframe.jss_strtoids(jss_resultframe.doclist[i]);
  return -1;
}

function AND_results(a,b) { 
  if ((a == -1) || (b == -1))  { return -1; }
  res = new Array();
  i = j = 0;
  while ((i < a.length) && (j < b.length)) { 
    while ((a[i] > b[j]) && (j < b.length)) j++;
    while ((a[i] < b[j]) && (i < a.length) && (j < b.length)) i++;
    if ((a[i] == b[j]) && (j < b.length) && (i < a.length)) {
      res=res.concat(a[i]); i++; j++;
    }
  }
  if (res.length)  return res; else return -1;
}

function numberorder(a,b) { return a - b; }

function OR_results(a,b) {
  if (a == -1) return b;
  if (b == -1) return a;
  res = new Array();
  i = j = 0;
  while ((i < a.length) && (j < b.length)) { 
    while ((a[i] > b[j]) && (j < b.length)) {
      res=res.concat(b[j]); j++;
    }
    while ((a[i] < b[j]) && (i < a.length) && (j < b.length)) {
      res=res.concat(a[i]); i++;
    }
    if ((a[i] == b[j]) && (j < b.length) && (i < a.length)) {
     res=res.concat(a[i]); i++; j++;
    }
  }
  if ((j >= b.length) && (i < a.length)) res=res.concat(a.slice(i));
  if ((i >= a.length) && (j < b.length)) res=res.concat(b.slice(j));
  return res;
}

function NOT_results(a,b) {
  //not b in a 
  if ((a == -1) || (b == -1)) return a;
  res = new Array();
  i = j = 0;
  while ((i < a.length) && (j < b.length)) { 
    while ((a[i] > b[j]) && (j < b.length)) j++;
    while ((a[i] < b[j]) && (i < a.length) && (j < b.length)) {
      res=res.concat(a[i]); i++;
    }
    if ((a[i] == b[j]) && (j < b.length) && (i < a.length)) i++;
  }
  if ((j >= b.length) && (i < a.length)) res=res.concat(a.slice(i));
  return res;
}

function evaluate_stack(result_temp) {
  if (result_stack.length > 0) {
   if (op_str.length) {
     op_str=op_str.substr(1);
     result_temp=OR_results(result_temp,pop(result_stack));
   }
   else {
    result_temp=AND_results(result_temp,pop(result_stack));
   }
   result_temp=evaluate_stack(result_temp);
  }
  return result_temp;
}

function search_string(searchval) {
  if ((op_str.length) && (!is_first))
    Search_words += " OR " + searchval;
  else
    Search_words += " " + searchval;
  a="";
  if (searchval.charAt(0)=="-") {
    a="-";
    searchval=searchval.substr(1);
  }
  //var a=new Date();
  result_temp=docsids(searchval);
  // Global_s+=result_temp.join(" ")+"<br><hr>\n";
  //var b=new Date();
  //alert(b.getTime()-a.getTime());
  if (a=="-") { result_temp = NOT_results(all_docs, result_temp); }
  if (!is_first) result_temp=evaluate_stack(result_temp);
  result_stack=result_stack.concat([result_temp]);
  if (polisharr.length == 0) {
    if ((result_temp.length == 0) || (result_temp==-1))
      write_results_nomatch();
    else { 
      default_result=result_temp;
      write_results(0,result_step);
    }
  }
  else load_doc();
}

function write_results_nomatch() { 
  if (Stop_words=="") Stop_words ="<b>none</b>";
  result_header(0,0,0,Stop_words,Search_words);
  doc_string=template_link_string;
  doc_string=jss_replace(doc_string,"<!-- INSERT LINK -->","No match");
  jss_resultframe.document.write(doc_string); 
  result_footer(0,0,0,Stop_words,Search_words);
  jss_resultframe.document.close();
}

function write_results(start,step) { 
  if (Stop_words=="") Stop_words ="<b>none</b>";
  result_header(start,default_result.length,step,Stop_words,Search_words);
  for (i=start; i < default_result.length && i < start+step; i++) { 
    if ((base_url=="")||(base_url==".")) {
     result_link(doc_url[default_result[i]],doc_url[default_result[i]],doc_text[default_result[i]]); 
    } else {
     result_link(base_url+"/"+doc_url[default_result[i]],base_url+"/"+doc_url[default_result[i]],doc_text[default_result[i]]); 
    }
  } 
  result_footer(start,default_result.length,step,Stop_words,Search_words);
  jss_resultframe.document.close();
}

function nav_link(result_start,result_step,max_result) {
  var  url_start = "javascript:parent.searchframe.write_results(";
  var  return_str="";
  var  nav_string="  PREV ";
  if (result_start > 1) 
    nav_string = nav_string.link(url_start + (result_start - result_step-1) + ", " + result_step +");");
  return_str += nav_string;
  var temp_value = Math.floor((max_result + result_step - 1) / result_step) * result_step;
  for(i = 0; i < temp_value; i+=result_step) {
    nav_string = (i+1) + "-" + Math.min((i + result_step),max_result);
    if (i!=result_start-1) nav_string=nav_string.link(url_start + i + ", " + result_step + ");");
    return_str += "[" + nav_string+"] ";
  }
  nav_string=" NEXT ";
  if (result_start-1 < (temp_value - result_step)) 
    nav_string = nav_string.link(url_start + (result_start-1 + result_step) + ", " + result_step +");");
  return_str += nav_string;
  return return_str;
}

function result_header(result_start,maxresults,result_step,stop_word_lst,query_lst) {  
  doc_string=template_head_string;
  result_start++;
  result_end = result_start + result_step - 1;
  result_end = (result_end < maxresults) ? result_end : maxresults;
  doc_string=jss_replace(doc_string,"<!-- INSERT MAXRESULT -->",maxresults);
  doc_string=jss_replace(doc_string,"<!-- INSERT PAGESTART -->",result_start);
  doc_string=jss_replace(doc_string,"<!-- INSERT PAGEEND -->",result_end);
  doc_string=jss_replace(doc_string,"<!-- INSERT QUERYWORDS -->",query_lst);
  doc_string=jss_replace(doc_string,"<!-- INSERT STOPWORDS -->",stop_word_lst);
  if (maxresults==0) {
    doc_string=jss_replace(doc_string,"<!-- INSERT NAVIGATION -->", "");
  } else {
    doc_string=jss_replace(doc_string,"<!-- INSERT NAVIGATION -->", nav_link(result_start,result_step,maxresults)); 
  }
  jss_resultframe.document.write(doc_string);
}

function result_link(s_string,s_url,doctext) {
  doc_string=template_link_string;
  //  doc_string=jss_replace(doc_string,"<!-- INSERT LINK -->",s_string.link(s_url)+"<br>"+doctext);
  doc_string=jss_replace(doc_string,"<!-- INSERT LINK -->","<a target=\"_parent\" href=\""+s_url+"\">"+s_url+"</a><br>"+doctext);
  jss_resultframe.document.write(doc_string); 
}

function result_footer(result_start,maxresults,result_step,stop_word_lst,query_lst) {
  doc_string=template_foot_string;
  result_start++;
  result_end = result_start + result_step - 1;
  result_end = (result_end < maxresults) ? result_end : maxresults;
  doc_string=jss_replace(doc_string,"<!-- INSERT MAXRESULT -->",maxresults);
  doc_string=jss_replace(doc_string,"<!-- INSERT PAGESTART -->",result_start);
  doc_string=jss_replace(doc_string,"<!-- INSERT PAGEEND -->",result_end);
  doc_string=jss_replace(doc_string,"<!-- INSERT QUERYWORDS -->",query_lst);
  doc_string=jss_replace(doc_string,"<!-- INSERT STOPWORDS -->",stop_word_lst);
  if (maxresults==0) {
    doc_string=jss_replace(doc_string,"<!-- INSERT NAVIGATION -->", "");
  } else {
    doc_string=jss_replace(doc_string,"<!-- INSERT NAVIGATION -->",
	                   nav_link(result_start,result_step,maxresults)); 
  }
  jss_resultframe.document.write(doc_string); 
}

function start_load_doc(searchval) {
  var a=new Date();
  Stop_words = stop_word_list.join(", ");
  for(i = 0;i < doc_url.length;i++) all_docs[i]=i;
  var b=new Date();
  searchval = searchval.replace(/\s+$/g,"");
  searchval = searchval.replace(/^\s+/g,"");
  searchval = searchval.replace(/\s+/g," ");
  searchval = searchval.replace(/^OR\s+/,"");
  searchval = searchval.replace(/\s+OR$/,"");
  polisharr = searchval.split(" ");
  for(i = 1; i < polisharr.length-1; i++) {
    if (polisharr[i] == "OR") {
      polisharr[i] = polisharr[i-1];
      polisharr[i-1] = "+";
    }
  }
  polisharr.reverse();

  op_str = "";
  result_stack = [];
  b=new Date();
  // alert(b.getTime()-a.getTime());
  Search_words = "";
  // Stop_words = "";

  is_start = 1;
  load_doc();
}

function pop(a) { 
  b=a[a.length-1]; a.length--; return b;
}

function load_doc() {
  searchval = pop(polisharr);
  is_first = 0;
  if (searchval == "+") {
      op_str += "+";
      searchval = pop(polisharr);
      is_first = 1;
  }
  a="";
  if (searchval.charAt(0)=="-") {
    a="-";
    searchval=searchval.substr(1);
  }
  searchval=jss_word_cleanup(searchval);
  if (searchval.length>2) {
    for(i = 0;(i < jss_index.length) && (searchval >= jss_index[i]);i++) { }; 
    i--;
    if ((!jss_resultframe.wordlist) || (jss_index[i]!=jss_resultframe.wordlist[0])) {
      s=""+i*1000;
      s1="000000";
      parent.resultframe.location=index_prefix+s1.substr(0,6-s.length)+s+".htm?"+a+searchval;
    } else {
      search_string(a+searchval);
    }
  } else {
    Stop_words=Stop_words + ", " + searchval;
    if (polisharr.length == 0) {
      if ((result_temp.length == 0) || (result_temp==-1))
        jss_resultframe.document.write("no match");
      else { 
        default_result=result_temp;
        write_results(0,result_step);
      }
    } else
      load_doc();
  }
}
