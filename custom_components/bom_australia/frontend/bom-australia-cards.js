var e=`https://github.com/tinkerologie/ha-bom-australia#dashboard-cards`,t=[`now`,`forecast`,`warnings`,`observations`],n=`bom-australia-card`,r={now:`bom-australia-now-card`,forecast:`bom-australia-forecast-card`,warnings:`bom-australia-warnings-card`,observations:`bom-australia-observations-card`},i={windDirection:`wind_direction`,windGust:`wind_gust`,windGustMax:`wind_gust_max`,rainSince9am:`rain_since_9am`,rain24h:`rain_24h`,observedTempMax:`observed_temp_max`,observedTempMin:`observed_temp_min`,deltaT:`delta_t`,observedAt:`observed_at`,tempMax:`temp_max`,tempMin:`temp_min`,shortText:`short_text`,extendedText:`extended_text`,rainChance:`rain_chance`,rainAmountRange:`rain_amount_range`,uvIndex:`uv_index`,uvCategory:`uv_category`,uvStart:`uv_start`,uvEnd:`uv_end`,fireDanger:`fire_danger`,nowLabel:`now_label`,nowTemp:`now_temp`,laterLabel:`later_label`,laterTemp:`later_temp`,warnings:`warnings`},a={"card.all.name":`BoM weather`,"card.all.description":`Current conditions, forecast, warnings and station observations for a Bureau of Meteorology forecast town.`,"card.now.name":`BoM now`,"card.now.description":`Current temperature and conditions with today's forecast, rain, UV and fire danger.`,"card.forecast.name":`BoM forecast`,"card.forecast.description":`Seven-day and hourly forecast with temperature ranges, rain chance and the BoM forecast text.`,"card.warnings.name":`BoM warnings`,"card.warnings.description":`Current Bureau of Meteorology warnings for the location, with the full warning text.`,"card.observations.name":`BoM observations`,"card.observations.description":`Latest readings from the Bureau of Meteorology observation station.`,"title.now":`Now`,"title.forecast":`Forecast`,"title.warnings":`Warnings`,"title.observations":`Observations`,"state.not_set_up":`Add the Bureau of Meteorology integration to use this card.`,"state.device_missing":`The selected forecast town no longer exists. Choose another one in the card settings.`,"state.unavailable":`Bureau of Meteorology data is unavailable at the moment.`,"state.forecast_unavailable":`The forecast is unavailable at the moment.`,"now.feels_like":`Feels like {value}`,"now.max":`Max {value}`,"now.min":`Min {value}`,"now.rain":`Rain`,"now.rain_value":`{chance} chance`,"now.uv":`UV`,"now.wind":`Wind`,"now.gusting":`gusting {value}`,"now.humidity":`Humidity`,"now.fire_danger":`Fire danger`,"now.station":`{station}, {time}`,"now.warnings":`{count} warnings`,"now.warnings_one":`{count} warning`,"forecast.daily":`7 days`,"forecast.hourly":`Hourly`,"forecast.today":`Today`,"forecast.rain_chance":`{value} chance of rain`,"forecast.range":`{low} to {high}`,"forecast.details":`Forecast details`,"warnings.none":`No warnings for {location}`,"warnings.issued":`Issued {time}`,"warnings.expires":`Expires {time}`,"warnings.show_message":`Show full warning`,"warnings.count":`{count} current`,"warnings.count_one":`{count} current`,"warnings.phase.new":`New`,"warnings.phase.update":`Update`,"warnings.phase.renewal":`Renewal`,"warnings.phase.upgrade":`Upgrade`,"warnings.phase.downgrade":`Downgrade`,"warnings.phase.final":`Final`,"observations.station":`{station} · {time}`,"observations.temperature":`Temperature`,"observations.feels_like":`Feels like`,"observations.humidity":`Humidity`,"observations.dew_point":`Dew point`,"observations.pressure":`Pressure`,"observations.wind":`Wind`,"observations.gust":`Gust`,"observations.gust_max":`Max gust today`,"observations.rain_since_9am":`Rain since 9am`,"observations.rain_24h":`Rain to 9am`,"observations.temp_max":`Highest today`,"observations.temp_min":`Lowest today`,"observations.delta_t":`Delta-T`,"uv.low":`Low`,"uv.moderate":`Moderate`,"uv.high":`High`,"uv.very_high":`Very high`,"uv.extreme":`Extreme`,"condition.clear-night":`Clear`,"condition.cloudy":`Cloudy`,"condition.exceptional":`Exceptional`,"condition.fog":`Fog`,"condition.hail":`Hail`,"condition.lightning":`Lightning`,"condition.lightning-rainy":`Storms`,"condition.partlycloudy":`Partly cloudy`,"condition.pouring":`Heavy rain`,"condition.rainy":`Showers`,"condition.snowy":`Snow`,"condition.snowy-rainy":`Sleet`,"condition.sunny":`Sunny`,"condition.windy":`Windy`,"condition.windy-variant":`Windy`,"action.show_all":`Show all {count}`,"action.show_less":`Show less`,"editor.device":`Forecast town`,"editor.device_helper":`Bureau of Meteorology forecast town to show. Defaults to the first one.`,"editor.title":`Title`,"editor.title_helper":`Leave empty for the default title.`,"editor.forecast_type":`Forecast`,"editor.forecast_type_helper":`Which forecast the card opens with.`,"editor.forecast_type.daily":`7 days`,"editor.forecast_type.hourly":`Hourly`,"editor.days":`Days`,"editor.days_helper":`Number of days in the daily forecast.`,"editor.hours":`Hours`,"editor.hours_helper":`Number of hours in the hourly forecast.`,"editor.show_text":`Show forecast text`,"editor.show_text_helper":`Show the BoM forecast text under each day.`,"editor.max_items":`Maximum warnings`,"editor.max_items_helper":`Warnings shown before the list is collapsed.`,"editor.sections":`Sections`,"editor.sections_helper":`Sections the card shows, in order.`,"editor.section.now":`Now`,"editor.section.forecast":`Forecast`,"editor.section.warnings":`Warnings`,"editor.section.observations":`Observations`},o={en:a};function s(e){let t=e?.locale?.language||e?.language||`en`;if(o[t])return{lang:t,strings:o[t]};let n=t.split(`-`)[0]??`en`;return o[n]?{lang:n,strings:o[n]}:{lang:`en`,strings:a}}function c(e,t){let n=s(e);return n.strings[t]===void 0?{lang:`en`,strings:a,template:a[t]}:{...n,template:n.strings[t]}}function l(e,t){return t?e.replace(/\{(\w+)\}/g,(e,n)=>n in t?String(t[n]):e):e}function u(e,t,n){return l(c(e,t).template??t,n)}function d(e,t){try{return new Intl.PluralRules(e).select(t)}catch{return t===1?`one`:`other`}}function ee(e,t,n,r=String(n)){let{lang:i,strings:a,template:o}=c(e,t),s=a[`${t}_one`];return l(d(i,n)===`one`&&s!==void 0?s:o??t,{count:r})}var f=globalThis,p=f.ShadowRoot&&(f.ShadyCSS===void 0||f.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,m=Symbol(),h=new WeakMap,g=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==m)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(p&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=h.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&h.set(t,e))}return e}toString(){return this.cssText}},te=e=>new g(typeof e==`string`?e:e+``,void 0,m),_=(e,...t)=>new g(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,m),ne=(e,t)=>{if(p)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),r=f.litNonce;r!==void 0&&t.setAttribute(`nonce`,r),t.textContent=n.cssText,e.appendChild(t)}},v=p?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return te(t)})(e):e,{is:re,defineProperty:ie,getOwnPropertyDescriptor:ae,getOwnPropertyNames:oe,getOwnPropertySymbols:se,getPrototypeOf:ce}=Object,y=globalThis,le=y.trustedTypes,ue=le?le.emptyScript:``,de=y.reactiveElementPolyfillSupport,b=(e,t)=>e,fe={toAttribute(e,t){switch(t){case Boolean:e=e?ue:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},pe=(e,t)=>!re(e,t),me={attribute:!0,type:String,converter:fe,reflect:!1,useDefault:!1,hasChanged:pe};Symbol.metadata??=Symbol(`metadata`),y.litPropertyMetadata??=new WeakMap;var x=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=me){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&ie(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=ae(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??me}static _$Ei(){if(this.hasOwnProperty(b(`elementProperties`)))return;let e=ce(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b(`properties`))){let e=this.properties,t=[...oe(e),...se(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(v(e))}else e!==void 0&&t.push(v(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ne(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?fe:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?fe:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??pe)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};x.elementStyles=[],x.shadowRootOptions={mode:`open`},x[b(`elementProperties`)]=new Map,x[b(`finalized`)]=new Map,de?.({ReactiveElement:x}),(y.reactiveElementVersions??=[]).push(`2.1.2`);var he=globalThis,ge=e=>e,S=he.trustedTypes,_e=S?S.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,ve=`$lit$`,C=`lit$${Math.random().toFixed(9).slice(2)}$`,ye=`?`+C,be=`<${ye}>`,w=document,T=()=>w.createComment(``),E=e=>e===null||typeof e!=`object`&&typeof e!=`function`,xe=Array.isArray,Se=e=>xe(e)||typeof e?.[Symbol.iterator]==`function`,Ce=`[ 	
\f\r]`,D=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,we=/-->/g,Te=/>/g,O=RegExp(`>|${Ce}(?:([^\\s"'>=/]+)(${Ce}*=${Ce}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),Ee=/'/g,De=/"/g,Oe=/^(?:script|style|textarea|title)$/i,k=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),A=Symbol.for(`lit-noChange`),j=Symbol.for(`lit-nothing`),ke=new WeakMap,M=w.createTreeWalker(w,129);function Ae(e,t){if(!xe(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return _e===void 0?t:_e.createHTML(t)}var je=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=D;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===D?c[1]===`!--`?o=we:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=O):(Oe.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=O):o=Te:o===O?c[0]===`>`?(o=i??D,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?O:c[3]===`"`?De:Ee):o===De||o===Ee?o=O:o===we||o===Te?o=D:(o=O,i=void 0);let d=o===O&&e[t+1].startsWith(`/>`)?` `:``;a+=o===D?n+be:l>=0?(r.push(s),n.slice(0,l)+ve+n.slice(l)+C+d):n+C+(l===-2?t:d)}return[Ae(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},Me=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=je(t,n);if(this.el=e.createElement(l,r),M.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=M.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(ve)){let t=u[o++],n=i.getAttribute(e).split(C),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?Fe:r[1]===`?`?Ie:r[1]===`@`?Le:P}),i.removeAttribute(e)}else e.startsWith(C)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(Oe.test(i.tagName)){let e=i.textContent.split(C),t=e.length-1;if(t>0){i.textContent=S?S.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],T()),M.nextNode(),c.push({type:2,index:++a});i.append(e[t],T())}}}else if(i.nodeType===8){if(i.data===ye)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(C,e+1))!==-1;)c.push({type:7,index:a}),e+=C.length-1}}a++}}static createElement(e,t){let n=w.createElement(`template`);return n.innerHTML=e,n}};function N(e,t,n=e,r){if(t===A)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=E(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=N(e,i._$AS(e,t.values),i,r)),t}var Ne=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??w).importNode(t,!0);M.currentNode=r;let i=M.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new Pe(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new Re(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=M.nextNode(),a++)}return M.currentNode=w,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},Pe=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=j,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=N(this,e,t),E(e)?e===j||e==null||e===``?(this._$AH!==j&&this._$AR(),this._$AH=j):e!==this._$AH&&e!==A&&this._(e):e._$litType$===void 0?e.nodeType===void 0?Se(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==j&&E(this._$AH)?this._$AA.nextSibling.data=e:this.T(w.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=Me.createElement(Ae(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new Ne(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=ke.get(e.strings);return t===void 0&&ke.set(e.strings,t=new Me(e)),t}k(t){xe(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(T()),this.O(T()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=ge(e).nextSibling;ge(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},P=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=j,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=j}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=N(this,e,t,0),a=!E(e)||e!==this._$AH&&e!==A,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=N(this,r[n+o],t,o),s===A&&(s=this._$AH[o]),a||=!E(s)||s!==this._$AH[o],s===j?e=j:e!==j&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===j?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},Fe=class extends P{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===j?void 0:e}},Ie=class extends P{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==j)}},Le=class extends P{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=N(this,e,t,0)??j)===A)return;let n=this._$AH,r=e===j&&n!==j||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==j&&(n===j||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Re=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){N(this,e)}},ze=he.litHtmlPolyfillSupport;ze?.(Me,Pe),(he.litHtmlVersions??=[]).push(`3.3.3`);var Be=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new Pe(t.insertBefore(T(),e),e,void 0,n??{})}return i._$AI(e),i},Ve=globalThis,F=class extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Be(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};F._$litElement$=!0,F.finalized=!0,Ve.litElementHydrateSupport?.({LitElement:F});var He=Ve.litElementPolyfillSupport;He?.({LitElement:F}),(Ve.litElementVersions??=[]).push(`4.2.2`);var I=_`
  :host {
    display: block;
    height: 100%;
    font-family: var(--ha-font-family-body);
    color: var(--primary-text-color);
    -webkit-font-smoothing: var(--ha-font-smoothing);
  }
  :host([embedded]) {
    height: auto;
  }
  ha-card,
  section.embedded {
    container-type: inline-size;
  }
  ha-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  section.embedded {
    display: flex;
    flex-direction: column;
  }
  .header {
    display: flex;
    align-items: center;
    gap: var(--ha-space-2);
    min-height: var(--ha-space-12);
    padding: var(--ha-space-2) var(--ha-space-2) 0 var(--ha-space-4);
  }
  .header ha-icon {
    color: var(--secondary-text-color);
    flex: none;
  }
  .header .heading {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .header .subtitle {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    line-height: var(--ha-line-height-condensed);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .header .title {
    min-width: 0;
    margin: 0;
    font-family: var(--ha-font-family-heading);
    font-size: var(--ha-font-size-l);
    font-weight: var(--ha-font-weight-medium);
    line-height: var(--ha-line-height-condensed);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .header .count {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-normal);
  }
  .header .actions {
    display: flex;
    align-items: center;
    flex: none;
    color: var(--secondary-text-color);
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-3);
    padding: var(--ha-space-2) var(--ha-space-4) var(--ha-space-4);
    min-height: 0;
  }
  .secondary {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    line-height: var(--ha-line-height-normal);
  }
  .list {
    display: flex;
    flex-direction: column;
    margin: 0 calc(-1 * var(--ha-space-4));
  }
  .list-title {
    margin: var(--ha-space-2) 0 0;
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-medium);
    letter-spacing: 0.02em;
  }
  .row {
    display: flex;
    align-items: center;
    min-width: 0;
  }
  .row ha-md-list-item {
    flex: 1;
    min-width: 0;
    --md-list-item-leading-space: var(--ha-space-4);
    --md-list-item-trailing-space: var(--ha-space-4);
    --md-list-item-top-space: var(--ha-space-2);
    --md-list-item-bottom-space: var(--ha-space-2);
    --md-list-item-label-text-size: var(--ha-font-size-m);
    --md-list-item-supporting-text-size: var(--ha-font-size-s);
    --md-list-item-trailing-supporting-text-size: var(--ha-font-size-s);
    --ha-md-list-item-gap: var(--ha-space-3);
  }
  .row .link {
    flex: none;
    margin-inline-end: var(--ha-space-2);
    color: var(--secondary-text-color);
  }
  .row .headline,
  .row .supporting {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .row .row-badge {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ha-space-1);
    margin: var(--ha-space-1) 0;
  }
  .row .trailing {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--ha-space-1);
    white-space: nowrap;
  }
  .bubble {
    --tone: var(--grey-color);
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--ha-space-9);
    height: var(--ha-space-9);
    border-radius: var(--ha-border-radius-pill);
    background-color: color-mix(in srgb, var(--tone) 20%, transparent);
    color: var(--tone);
  }
  .bubble.large {
    width: var(--ha-space-12);
    height: var(--ha-space-12);
  }
  .badge {
    --tone: var(--grey-color);
    display: inline-flex;
    align-items: center;
    gap: var(--ha-space-1);
    max-width: 100%;
    padding: 0 var(--ha-space-2);
    min-height: var(--ha-space-6);
    border-radius: var(--ha-border-radius-pill);
    background-color: color-mix(in srgb, var(--tone) 18%, transparent);
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-medium);
    line-height: var(--ha-line-height-condensed);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .badge ha-icon {
    color: var(--tone);
    --mdc-icon-size: var(--ha-space-4);
    flex: none;
  }
  .empty {
    display: flex;
    align-items: center;
    gap: var(--ha-space-3);
    padding: var(--ha-space-2) 0;
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-m);
  }
  .empty ha-icon {
    flex: none;
  }
  ha-chip-set {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ha-space-2);
  }
  ha-alert {
    display: block;
  }
  .more {
    align-self: flex-start;
  }
  hr.divider {
    width: 100%;
    margin: 0;
    border: none;
    border-top: var(--ha-border-width-sm) solid var(--divider-color);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  :where(button.plain) {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    border-radius: var(--ha-border-radius-lg);
  }
  :focus-visible {
    outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
    outline-offset: var(--ha-border-width-md);
  }
  /* Narrow sections-view cells (3 of 12 columns). */
  @container (max-width: 240px) {
    .header > ha-icon {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;function Ue(e,t,n){e.dispatchEvent(new CustomEvent(t,{detail:n,bubbles:!0,composed:!0}))}function We(e,t){t&&Ue(e,`hass-more-info`,{entityId:t})}var Ge=new WeakMap;function Ke(e){let t=e.entities,n=Ge.get(t);if(n)return n;let r=new Map,i=new Map;for(let t of Object.values(e.entities??{})){if(t.platform!==`bom_australia`||!t.device_id)continue;if(t.entity_id.startsWith(`weather.`)){i.set(t.device_id,t.entity_id);continue}if(!t.translation_key)continue;let e=r.get(t.device_id);e||r.set(t.device_id,e=new Map);let n=e.get(t.translation_key)??[];n.push(t.entity_id),e.set(t.translation_key,n)}let a=new Set([...r.keys(),...i.keys()]),o=Object.keys(e.devices??{}).filter(e=>a.has(e));for(let e of a)o.includes(e)||o.push(e);let s={devices:o,byKey:r,weather:i};return Ge.set(t,s),s}function L(e){return Ke(e).devices}function qe(e,t){return t||L(e)[0]}function Je(e,t){return!!t&&L(e).includes(t)}function Ye(e,t){if(!t)return;let n=e.devices?.[t];return n?.name_by_user||n?.name||void 0}function Xe(e,t){return t?Ke(e).weather.get(t):void 0}function R(e,t,n){return t?Ke(e).byKey.get(t)?.get(n)??[]:[]}function Ze(e,t,n){return R(e,t,n)[0]}function z(e,t,n){let r=Ze(e,t,n);return r?e.states[r]:void 0}function B(e,t,n){let r=new Map;for(let i of R(e,t,n)){let t=e.states[i],n=t?.attributes.date;t&&typeof n==`string`&&r.set(n,t)}return r}function V(e,t,n){let r=B(e,t,n),i=[...r.keys()].sort()[0];return i?r.get(i):void 0}var Qe=[`ha-card`,`ha-icon`,`ha-icon-button`,`ha-button`,`ha-alert`,`ha-assist-chip`,`ha-filter-chip`,`ha-chip-set`,`ha-md-list-item`,`ha-tooltip`],$e;function et(e=5e3){return $e??=(async()=>{try{await window.loadCardHelpers?.()}catch{}await Promise.race([Promise.all(Qe.map(e=>customElements.whenDefined(e))),new Promise(t=>setTimeout(t,e))])})(),$e}var tt={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},nt=e=>(...t)=>({_$litDirective$:e,values:t}),rt=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,n){this._$Ct=e,this._$AM=t,this._$Ci=n}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}},it=`important`,at=` !`+it,ot=nt(class extends rt{constructor(e){if(super(e),e.type!==tt.ATTRIBUTE||e.name!==`style`||e.strings?.length>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(e){return Object.keys(e).reduce((t,n)=>{let r=e[n];return r==null?t:t+`${n=n.includes(`-`)?n:n.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,`-$&`).toLowerCase()}:${r};`},``)}update(e,[t]){let{style:n}=e.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(t)),this.render(t);for(let e of this.ft)t[e]??(this.ft.delete(e),e.includes(`-`)?n.removeProperty(e):n[e]=null);for(let e in t){let r=t[e];if(r!=null){this.ft.add(e);let t=typeof r==`string`&&r.endsWith(at);e.includes(`-`)||t?n.setProperty(e,t?r.slice(0,-11):r,t?it:``):n[e]=r}}return A}});function st(e){return`var(--${e}-color)`}var ct=e=>ot({"--tone":st(e)});function lt(e,t,n=!1){return k`<span class="bubble ${n?`large`:``}" style=${ct(t)} aria-hidden="true">
    <ha-icon .icon=${e}></ha-icon>
  </span>`}function H(e,t,n){return k`<span class="badge" style=${ct(t)}>
    ${n?k`<ha-icon .icon=${n} aria-hidden="true"></ha-icon>`:j}<span>${e}</span>
  </span>`}function ut(e,t){return k`<div class="empty"><ha-icon .icon=${e} aria-hidden="true"></ha-icon><span>${t}</span></div>`}function U(e,t){return k`<ha-alert alert-type=${e}>${t}</ha-alert>`}function dt(e){return k`<div class="header">
    <ha-icon .icon=${e.icon} aria-hidden="true"></ha-icon>
    <div class="heading">
      <h2 class="title">${e.title}${e.count?k` <span class="count">${e.count}</span>`:j}</h2>
      ${e.subtitle?k`<span class="subtitle">${e.subtitle}</span>`:j}
    </div>
    ${e.onDetails?k`<div class="actions">
            <ha-icon-button .label=${e.detailsLabel??``} @click=${e.onDetails}>
              <ha-icon icon="mdi:information-outline"></ha-icon>
            </ha-icon-button>
          </div>`:j}
  </div>`}function ft(e,t,n,r){return k`<ha-button
    class="more"
    appearance="plain"
    size="s"
    aria-expanded=${t?`true`:`false`}
    @click=${r}
    >${t?u(e,`action.show_less`):u(e,`action.show_all`,{count:n})}</ha-button
  >`}var W=class extends F{static properties={hass:{attribute:!1},embedded:{type:Boolean,reflect:!0},_config:{state:!0}};static styles=[I];constructor(){super(),this.embedded=!1}entityKeys(){return[]}usesWeather=!1;static validateConfig(e){if(!e||typeof e!=`object`)throw Error(`Invalid configuration`);if(e.device!==void 0&&typeof e.device!=`string`)throw Error(`'device' must be a device ID`);if(e.title!==void 0&&typeof e.title!=`string`)throw Error(`'title' must be text`)}setConfig(e){this.constructor.validateConfig(e),this._config={...e}}get config(){return this._config}get deviceId(){return this.hass?qe(this.hass,this._config?.device):void 0}get townName(){return this.hass?Ye(this.hass,this.deviceId):void 0}get weatherId(){return this.hass?Xe(this.hass,this.deviceId):void 0}get weather(){let e=this.weatherId;return e?this.hass?.states[e]:void 0}cardTitle(){return this._config?.title||u(this.hass,this.titleKey)}moreInfo(e){We(this,e)}trackedEntityIds(e){let t=qe(e,this._config?.device),n=this.entityKeys().flatMap(n=>R(e,t,n));if(this.usesWeather){let r=Xe(e,t);r&&n.push(r)}return n}shouldUpdate(e){if(!e.has(`hass`)||e.size>1)return!0;let t=e.get(`hass`),n=this.hass;if(!t||!n||t.entities!==n.entities||t.devices!==n.devices||t.locale!==n.locale||t.themes?.darkMode!==n.themes?.darkMode)return!0;let r=new Set([...this.trackedEntityIds(t),...this.trackedEntityIds(n)]);for(let e of r)if(t.states[e]!==n.states[e])return!0;return!1}connectedCallback(){super.connectedCallback(),et()}getCardSize(){return 3}getGridOptions(){return{columns:12,rows:`auto`,min_columns:6}}renderSetupState(e){if(L(e).length===0)return k`<div class="content">${U(`info`,u(e,`state.not_set_up`))}</div>`;if(this._config?.device&&!Je(e,this._config.device))return k`<div class="content">${U(`warning`,u(e,`state.device_missing`))}</div>`}render(){if(!this._config||!this.hass)return j;let e=this.renderSetupState(this.hass)??this.renderBody(this.hass,this._config);return this.embedded?k`<section class="embedded" aria-label=${this.cardTitle()}>${e}</section>`:k`<ha-card>${e}</ha-card>`}};function G(e){let t=e?L(e)[0]:void 0;return t?{device:t}:{}}function K(){return[{name:`device`,selector:{device:{filter:{integration:`bom_australia`}}}},{name:`title`,selector:{text:{}}}]}var pt={device:`editor.device`,title:`editor.title`,forecast_type:`editor.forecast_type`,days:`editor.days`,hours:`editor.hours`,show_text:`editor.show_text`,max_items:`editor.max_items`,sections:`editor.sections`},mt={device:`editor.device_helper`,title:`editor.title_helper`,forecast_type:`editor.forecast_type_helper`,days:`editor.days_helper`,hours:`editor.hours_helper`,show_text:`editor.show_text_helper`,max_items:`editor.max_items_helper`,sections:`editor.sections_helper`},q=e=>{let t=pt[e.name];return t?u(void 0,t):void 0},J=e=>{let t=mt[e.name];return t?u(void 0,t):void 0};function ht(e,t,n=1,r=1e3){let i=e[t];if(i!=null&&(typeof i!=`number`||!Number.isInteger(i)||i<n||i>r))throw Error(`'${t}' must be a whole number from ${n} to ${r}`)}function gt(e,t){let n=e[t];if(n!==void 0&&typeof n!=`boolean`)throw Error(`'${t}' must be true or false`)}function _t(e,t,n){let r=e[t];if(r!=null&&(typeof r!=`string`||!n.includes(r)))throw Error(`'${t}' must be one of: ${n.join(`, `)}`)}function vt(e,t,n){let r=e[t];if(r!=null&&(!Array.isArray(r)||r.some(e=>typeof e!=`string`||!n.includes(e))))throw Error(`'${t}' must be a list of: ${n.join(`, `)}`)}var yt=class extends W{static styles=[I,_`
      .sections > * + * {
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
    `];titleKey=`card.all.name`;static validateConfig(e){super.validateConfig(e),vt(e,`sections`,t)}static getConfigForm(){return{schema:[...K(),{name:`sections`,default:[...t],selector:{select:{multiple:!0,reorder:!0,options:t.map(e=>({value:e,label:u(void 0,`editor.section.${e}`)}))}}}],computeLabel:q,computeHelper:J,assertConfig:e=>this.validateConfig(e)}}static getStubConfig(e){return G(e)}getCardSize(){return 12}shouldUpdate(){return!0}renderBody(e,n){return k`<div class="sections">
      ${(n.sections??[...t]).map(t=>this.embeddedCard(r[t],{device:n.device},e))}
    </div>`}cards=new Map;embeddedCard(e,t,n){let r=this.cards.get(e);r||(r=document.createElement(e),r.setAttribute(`embedded`,``),this.cards.set(e,r));let i=JSON.stringify(t);return r.dataset.config!==i&&(r.setConfig?.({type:`custom:${e}`,...t}),r.dataset.config=i),r.hass=n,r}},bt=3e4,xt=class{host;forecast;failed=!1;key;unsubscribe;retry;connected=!1;constructor(e){this.host=e,e.addController(this)}hostConnected(){this.connected=!0}hostDisconnected(){this.connected=!1,this.release()}update(e,t,n){if(!this.connected||!e?.connection||!t)return;let r=`${t}|${n}`;r!==this.key&&(this.release(),this.key=r,this.forecast=void 0,this.failed=!1,this.unsubscribe=e.connection.subscribeMessage(e=>{this.key===r&&(this.forecast=e.forecast??[],this.host.requestUpdate())},{type:`weather/subscribe_forecast`,entity_id:t,forecast_type:n}).catch(()=>{this.key===r&&(this.failed=!0,this.host.requestUpdate(),this.retry=setTimeout(()=>{this.key=void 0,this.update(e,t,n)},bt))}))}release(){this.retry&&clearTimeout(this.retry),this.retry=void 0;let e=this.unsubscribe;this.unsubscribe=void 0,this.key=void 0,e?.then(e=>e?.()).catch(()=>void 0)}},St=new Set([`unavailable`,`unknown`]);function Y(e){return!e||St.has(e.state)}function X(e){return e.locale?.language||e.language||`en`}function Ct(e){return e.locale?.time_zone===`server`?e.config?.time_zone:void 0}function wt(e,t){if(e.formatEntityState)return e.formatEntityState(t);let n=t.attributes.unit_of_measurement;return n?`${t.state} ${n}`:t.state}function Z(e,t,n,r){let i=r===void 0?t.attributes[n]:r;return e.formatEntityAttributeValue?e.formatEntityAttributeValue(t,n,i):typeof i==`number`?Tt(e,i):String(i??``)}function Tt(e,t,n){try{return new Intl.NumberFormat(X(e),n).format(t)}catch{return String(t)}}function Et(e){if(typeof e!=`string`&&typeof e!=`number`)return;let t=typeof e==`string`?/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(e.trim()):null;if(t)return new Date(Number(t[1]));let n=new Date(e);return Number.isNaN(n.getTime())?void 0:n}var Dt=[[`year`,31536e3],[`month`,2592e3],[`week`,604800],[`day`,86400],[`hour`,3600],[`minute`,60],[`second`,1]];function Ot(e,t,n=Date.now()){let r=Et(t);if(!r)return;let i=Math.round((r.getTime()-n)/1e3),a=new Intl.RelativeTimeFormat(X(e),{numeric:`auto`});for(let[e,t]of Dt)if(Math.abs(i)>=t||e===`second`)return a.format(Math.round(i/t),e)}function kt(e,t,n={dateStyle:`medium`,timeStyle:`short`}){let r=Et(t);if(r)try{return new Intl.DateTimeFormat(X(e),{...n,timeZone:Ct(e)}).format(r)}catch{return r.toISOString()}}function Q(e){if(typeof e==`number`)return Number.isFinite(e)?e:void 0;if(typeof e==`string`&&e.trim()!==``){let t=Number(e);return Number.isFinite(t)?t:void 0}}function $(e){return typeof e==`string`&&e.trim()?e.trim():void 0}function At(e){return Array.isArray(e)?e.filter(e=>e&&typeof e==`object`):[]}var jt={"clear-night":`mdi:weather-night`,cloudy:`mdi:weather-cloudy`,exceptional:`mdi:alert-circle-outline`,fog:`mdi:weather-fog`,hail:`mdi:weather-hail`,lightning:`mdi:weather-lightning`,"lightning-rainy":`mdi:weather-lightning-rainy`,partlycloudy:`mdi:weather-partly-cloudy`,pouring:`mdi:weather-pouring`,rainy:`mdi:weather-rainy`,snowy:`mdi:weather-snowy`,"snowy-rainy":`mdi:weather-snowy-rainy`,sunny:`mdi:weather-sunny`,windy:`mdi:weather-windy`,"windy-variant":`mdi:weather-windy-variant`},Mt={partlycloudy:`mdi:weather-night-partly-cloudy`,sunny:`mdi:weather-night`};Object.keys(jt);function Nt(e,t){return e?t===!1&&Mt[e]?Mt[e]:jt[e]??`mdi:weather-cloudy-clock`:`mdi:weather-cloudy-clock`}function Pt(e){switch(e){case`sunny`:return`amber`;case`clear-night`:return`purple`;case`rainy`:case`pouring`:case`hail`:return`blue`;case`lightning`:case`lightning-rainy`:case`exceptional`:return`orange`;default:return`grey`}}function Ft(e){if(e!==void 0&&Number.isFinite(e))return e>=11?`extreme`:e>=8?`very_high`:e>=6?`high`:e>=3?`moderate`:`low`}function It(e){switch(e){case`low`:return`green`;case`moderate`:return`yellow`;case`high`:return`orange`;case`very_high`:return`red`;case`extreme`:return`purple`;default:return`grey`}}function Lt(e){switch(e?.trim().toLowerCase()){case`moderate`:return`green`;case`high`:return`yellow`;case`extreme`:return`orange`;case`catastrophic`:return`red`;default:return`grey`}}function Rt(e){let t=e??``;return t.includes(`flood`)?`mdi:home-flood`:t.includes(`thunderstorm`)?`mdi:weather-lightning-rainy`:t.includes(`fire`)?`mdi:fire-alert`:t.includes(`heat`)?`mdi:thermometer-alert`:t.includes(`cyclone`)?`mdi:weather-hurricane`:t.includes(`wind`)||t.includes(`gale`)?`mdi:weather-windy`:t.includes(`marine`)||t.includes(`surf`)||t.includes(`tsunami`)?`mdi:waves`:t.includes(`frost`)||t.includes(`sheep`)?`mdi:snowflake-alert`:t.includes(`dust`)||t.includes(`smoke`)?`mdi:weather-hazy`:`mdi:alert-outline`}function zt(e){return e===`major`?`red`:`amber`}function Bt(e,t,n,r){if(t===void 0||!Number.isFinite(n)||!Number.isFinite(r))return;let i=Math.max(r-n,1),a=e??t,o=(Math.min(a,t)-n)/i*100,s=Math.abs(t-a)/i*100;return{start:Vt(o,0,100),width:Vt(s,2,100-Vt(o,0,100))}}function Vt(e,t,n){return Math.min(Math.max(e,t),n)}var Ht=[`daily`,`hourly`],Ut=7,Wt=24,Gt=class extends W{static properties={...W.properties,_type:{state:!0}};static styles=[I,_`
      .toggle {
        display: flex;
        gap: var(--ha-space-2);
        padding: 0 var(--ha-space-4);
      }
      .days {
        display: flex;
        flex-direction: column;
      }
      .day {
        display: grid;
        grid-template-columns: minmax(4.5rem, auto) var(--ha-space-8) minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--ha-space-1) var(--ha-space-3);
        padding: var(--ha-space-2) 0;
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
      .day:first-child {
        border-top: none;
      }
      .day .name {
        font-weight: var(--ha-font-weight-medium);
      }
      .day ha-icon {
        color: var(--state-icon-color);
      }
      .day .middle {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .day .rain {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-1);
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .day .rain ha-icon {
        --mdc-icon-size: var(--ha-space-4);
        color: var(--blue-color);
      }
      .temps {
        display: grid;
        grid-template-columns: 2.5rem 5rem 2.5rem;
        align-items: center;
        gap: var(--ha-space-2);
        font-variant-numeric: tabular-nums;
      }
      .temps .low {
        color: var(--secondary-text-color);
        text-align: end;
      }
      .temps .high {
        font-weight: var(--ha-font-weight-medium);
      }
      .bar {
        position: relative;
        height: var(--ha-space-1);
        border-radius: var(--ha-border-radius-pill);
        background: var(--divider-color);
      }
      .bar span {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: var(--ha-border-radius-pill);
        background: linear-gradient(to right, var(--blue-color), var(--amber-color), var(--red-color));
      }
      details.text {
        grid-column: 1 / -1;
        font-size: var(--ha-font-size-s);
        color: var(--secondary-text-color);
      }
      details.text summary {
        cursor: pointer;
        width: fit-content;
      }
      details.text summary:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      details.text p {
        margin: var(--ha-space-1) 0 0;
        color: var(--primary-text-color);
        line-height: var(--ha-line-height-normal);
      }
      .hours {
        display: flex;
        gap: var(--ha-space-2);
        overflow-x: auto;
        padding-bottom: var(--ha-space-2);
        scroll-snap-type: x proximity;
      }
      .hour {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ha-space-1);
        min-width: 3.5rem;
        scroll-snap-align: start;
        font-variant-numeric: tabular-nums;
      }
      .hour .time {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .hour ha-icon {
        color: var(--state-icon-color);
      }
      .hour .rain {
        color: var(--blue-color);
        font-size: var(--ha-font-size-s);
      }
      @container (max-width: 360px) {
        .day {
          grid-template-columns: minmax(3.5rem, auto) var(--ha-space-8) minmax(0, 1fr);
        }
        .temps {
          grid-column: 2 / -1;
          grid-template-columns: 2.5rem 1fr 2.5rem;
        }
      }
    `];titleKey=`title.forecast`;usesWeather=!0;forecasts=new xt(this);entityKeys(){return[i.shortText,i.extendedText,i.rainAmountRange]}static validateConfig(e){super.validateConfig(e);let t=e;_t(t,`forecast_type`,Ht),ht(t,`days`,1,7),ht(t,`hours`,1,72),gt(t,`show_text`)}static getConfigForm(){return{schema:[...K(),{name:`forecast_type`,default:`daily`,selector:{select:{mode:`dropdown`,options:Ht.map(e=>({value:e,label:u(void 0,`editor.forecast_type.${e}`)}))}}},{name:`days`,default:Ut,selector:{number:{min:1,max:7,mode:`box`}}},{name:`hours`,default:Wt,selector:{number:{min:1,max:72,mode:`box`}}},{name:`show_text`,default:!0,selector:{boolean:{}}}],computeLabel:q,computeHelper:J,assertConfig:e=>this.validateConfig(e)}}static getStubConfig(e){return G(e)}getCardSize(){return this.type===`hourly`?3:7}get type(){return this._type??this._config?.forecast_type??`daily`}updated(){this.forecasts.update(this.hass,this.weatherId,this.type)}select(e){this._type=e}renderBody(e,t){let n=this.weather,r=this.forecasts.forecast,i;return i=Y(n)||this.forecasts.failed&&!r?U(`warning`,u(e,`state.forecast_unavailable`)):r?this.type===`hourly`?this.renderHours(e,n,r.slice(0,t.hours??Wt)):this.renderDays(e,n,r.slice(0,t.days??Ut),t):k`<span class="secondary" aria-busy="true">…</span>`,k`
      ${dt({title:this.cardTitle(),icon:`mdi:calendar-week`,subtitle:this.townName})}
      <div class="toggle" role="group" aria-label=${this.cardTitle()}>
        <ha-chip-set>
          ${Ht.map(t=>k`<ha-filter-chip
              .label=${u(e,`forecast.${t}`)}
              .selected=${this.type===t}
              @click=${()=>this.select(t)}
            ></ha-filter-chip>`)}
        </ha-chip-set>
      </div>
      <div class="content">${i}</div>
    `}renderDays(e,t,n,r){let a=B(e,this.deviceId,i.shortText),o=B(e,this.deviceId,i.extendedText),s=B(e,this.deviceId,i.rainAmountRange),c=n.flatMap(e=>[Q(e.templow),Q(e.temperature)]).filter(e=>e!==void 0),l=Math.min(...c),d=Math.max(...c);return k`<div class="days" role="list">
      ${n.map((n,i)=>{let c=n.datetime.slice(0,10),ee=Kt(a.get(c)),f=Kt(o.get(c)),p=Kt(s.get(c)),m=p?.state===`0 mm`?void 0:p,h=Q(n.temperature),g=Q(n.templow),te=Q(n.precipitation_probability),_=g===void 0?void 0:Bt(g,h,l,d),ne=i===0?u(e,`forecast.today`):this.weekday(e,n.datetime),v=n.condition?u(e,`condition.${n.condition}`):``,re=f?String(f.attributes.text??f.state):void 0;return k`<div class="day" role="listitem">
          <span class="name">${ne}</span>
          <ha-icon .icon=${Nt(n.condition)} .label=${v} aria-hidden="true"></ha-icon>
          <span class="middle">
            <span>${ee?.state??v}</span>
            ${te===void 0?j:k`<span class="rain"
                    ><ha-icon icon="mdi:umbrella-outline" aria-hidden="true"></ha-icon
                    >${u(e,`forecast.rain_chance`,{value:`${te}%`})}${m?k`, ${m.state}`:j}</span
                  >`}
          </span>
          <span
            class="temps"
            aria-label=${u(e,`forecast.range`,{low:g===void 0?`–`:Z(e,t,`temperature`,g),high:h===void 0?`–`:Z(e,t,`temperature`,h)})}
          >
            <span class="low" aria-hidden="true">${g===void 0?``:`${Math.round(g)}°`}</span>
            ${_?k`<span class="bar" aria-hidden="true"
                    ><span style=${ot({insetInlineStart:`${_.start}%`,width:`${_.width}%`})}></span
                  ></span>`:k`<span aria-hidden="true"></span>`}
            <span class="high" aria-hidden="true">${h===void 0?``:`${Math.round(h)}°`}</span>
          </span>
          ${r.show_text!==!1&&re?k`<details class="text">
                  <summary>${u(e,`forecast.details`)}</summary>
                  <p>${re}</p>
                </details>`:j}
        </div>`})}
    </div>`}renderHours(e,t,n){return k`<div class="hours" role="list" tabindex="0" aria-label=${u(e,`forecast.hourly`)}>
      ${n.map(n=>{let r=Q(n.temperature),i=Q(n.precipitation_probability),a=n.condition?u(e,`condition.${n.condition}`):``,o=kt(e,n.datetime,{hour:`numeric`})??``;return k`<div
          class="hour"
          role="listitem"
          aria-label=${[o,a,r===void 0?``:Z(e,t,`temperature`,r)].filter(Boolean).join(`, `)}
        >
          <span class="time" aria-hidden="true">${o}</span>
          <ha-icon .icon=${Nt(n.condition,n.is_daytime)} aria-hidden="true"></ha-icon>
          <span aria-hidden="true">${r===void 0?`–`:`${Math.round(r)}°`}</span>
          <span class="rain" aria-hidden="true">${i?`${i}%`:``}</span>
        </div>`})}
    </div>`}weekday(e,t){try{return new Intl.DateTimeFormat(X(e),{weekday:`short`,day:`numeric`,timeZone:Ct(e)??e.config?.time_zone}).format(new Date(t))}catch{return t.slice(0,10)}}};function Kt(e){return e&&!Y(e)?e:void 0}var qt=class extends W{static styles=[I,_`
      .hero {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
        padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
        border-radius: var(--ha-border-radius-lg);
      }
      .hero:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      .hero .bubble.large {
        --mdc-icon-size: var(--ha-space-10);
        width: var(--ha-space-16);
        height: var(--ha-space-16);
      }
      .hero-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: var(--ha-space-1);
      }
      .temperature {
        font-size: var(--ha-font-size-4xl);
        font-weight: var(--ha-font-weight-normal);
        line-height: var(--ha-line-height-condensed);
        font-variant-numeric: tabular-nums;
      }
      .condition {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
      }
      .today {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--ha-space-1) var(--ha-space-3);
      }
      .summary {
        font-size: var(--ha-font-size-m);
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--ha-space-2);
      }
      .stat {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        min-width: 0;
        padding: var(--ha-space-2);
        border: var(--ha-border-width-sm) solid var(--divider-color);
        border-radius: var(--ha-border-radius-md);
        background: none;
        color: inherit;
        font: inherit;
        text-align: start;
      }
      button.stat {
        cursor: pointer;
      }
      button.stat:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      .stat ha-icon {
        color: var(--tone);
        flex: none;
      }
      .stat .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .stat .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .stat .value {
        font-weight: var(--ha-font-weight-medium);
        overflow-wrap: anywhere;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
      }
      .badges button {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        border-radius: var(--ha-border-radius-pill);
      }
      .badges button:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      @container (min-width: 600px) {
        .stats {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      @container (max-width: 320px) {
        .temperature {
          font-size: var(--ha-font-size-3xl);
        }
      }
    `];titleKey=`title.now`;usesWeather=!0;daily=new xt(this);entityKeys(){return[i.shortText,i.rainChance,i.rainAmountRange,i.uvIndex,i.uvCategory,i.fireDanger,i.windDirection,i.windGust,i.observedAt,i.warnings]}static getConfigForm(){return{schema:K(),computeLabel:q,computeHelper:J,assertConfig:e=>this.validateConfig(e)}}static getStubConfig(e){return G(e)}getCardSize(){return 4}updated(){this.daily.update(this.hass,this.weatherId,`daily`)}renderBody(e){let t=this.weather;return Y(t)?k`<div class="content">${U(`warning`,u(e,`state.unavailable`))}</div>`:k`
      ${this.renderHero(e,t)}
      <div class="content">
        ${this.renderToday(e)} ${this.renderStats(e,t)} ${this.renderBadges(e)}
      </div>
    `}renderHero(e,t){let n=t.state,r=u(e,`condition.${n}`),a=Z(e,t,`temperature`),o=t.attributes.apparent_temperature,s=z(e,this.deviceId,i.observedAt),c=$(s?.attributes.station_name),l=s&&!Y(s)?Ot(e,s.state):void 0;return k`<button
      class="hero"
      aria-label=${`${this.townName??``} ${a} ${r}`}
      @click=${()=>this.moreInfo(this.weatherId)}
    >
      ${lt(Nt(n),Pt(n),!0)}
      <span class="hero-text">
        <span class="temperature">${a}</span>
        <span class="condition">${r}</span>
        ${o==null?j:k`<span class="secondary"
                >${u(e,`now.feels_like`,{value:Z(e,t,`apparent_temperature`)})}</span
              >`}
        ${c?k`<span class="secondary">${l?u(e,`now.station`,{station:c,time:l}):c}</span>`:j}
      </span>
    </button>`}renderToday(e){let t=V(e,this.deviceId,i.shortText),n=this.daily.forecast?.[0],r=this.weather,a=Q(n?.temperature),o=Q(n?.templow),s=[a===void 0?void 0:u(e,`now.max`,{value:Z(e,r,`temperature`,a)}),o===void 0?void 0:u(e,`now.min`,{value:Z(e,r,`temperature`,o)})].filter(Boolean),c=t&&!Y(t)?t.state:void 0;return!c&&s.length===0?j:k`<div class="today">
      ${c?k`<span class="summary">${c}</span>`:j}
      ${s.length?k`<span class="secondary">${s.join(` · `)}</span>`:j}
    </div>`}renderStats(e,t){let n=[],r=this.deviceId,a=V(e,r,i.rainChance),o=V(e,r,i.rainAmountRange);if(a&&!Y(a)){let t=[u(e,`now.rain_value`,{chance:wt(e,a)})];o&&!Y(o)&&o.state!==`0 mm`&&t.unshift(o.state),n.push({icon:`mdi:umbrella-outline`,label:u(e,`now.rain`),value:t.join(`, `),tone:`blue`,entityId:a.entity_id})}let s=V(e,r,i.uvIndex),c=s&&!Y(s)?Q(s.state):Q(t.attributes.uv_index);if(c!==void 0){let t=Ft(c),r=t?u(e,`uv.${t}`):``;n.push({icon:`mdi:sun-wireless-outline`,label:u(e,`now.uv`),value:`${Math.round(c)} ${r}`.trim(),tone:It(t),entityId:s?.entity_id})}if(t.attributes.wind_speed!=null){let a=z(e,r,i.windDirection),o=t.attributes.wind_gust_speed,s=[a&&!Y(a)?a.state:void 0,Z(e,t,`wind_speed`)].filter(Boolean).join(` `),c=o==null?``:`, ${u(e,`now.gusting`,{value:Z(e,t,`wind_gust_speed`)})}`;n.push({icon:`mdi:weather-windy`,label:u(e,`now.wind`),value:s+c,tone:`grey`,entityId:a?.entity_id})}return t.attributes.humidity!==void 0&&t.attributes.humidity!==null&&n.push({icon:`mdi:water-percent`,label:u(e,`now.humidity`),value:Z(e,t,`humidity`),tone:`blue`}),k`<div class="stats">${n.map(e=>this.renderStat(e))}</div>`}renderStat(e){let t=k`<ha-icon .icon=${e.icon} aria-hidden="true"></ha-icon>
      <span class="text"><span class="label">${e.label}</span><span class="value">${e.value}</span></span>`,n=ot({"--tone":st(e.tone)});return e.entityId?k`<button class="stat" style=${n} @click=${()=>this.moreInfo(e.entityId)}>${t}</button>`:k`<div class="stat" style=${n}>${t}</div>`}renderBadges(e){let t=[],n=V(e,this.deviceId,i.fireDanger);n&&!Y(n)&&t.push(k`<button @click=${()=>this.moreInfo(n.entity_id)}>
          ${H(`${u(e,`now.fire_danger`)}: ${n.state}`,Lt(n.state),`mdi:fire`)}
        </button>`);let r=z(e,this.deviceId,i.warnings),a=r?Q(r.state):void 0;return r&&a&&t.push(k`<button @click=${()=>this.moreInfo(r.entity_id)}>
          ${H(ee(e,`now.warnings`,a),`red`,`mdi:alert`)}
        </button>`),t.length?k`<div class="badges">${t}</div>`:j}},Jt=[[`observations.temperature`,`mdi:thermometer`,`temperature`],[`observations.feels_like`,`mdi:thermometer-lines`,`apparent_temperature`],[`observations.humidity`,`mdi:water-percent`,`humidity`],[`observations.dew_point`,`mdi:thermometer-water`,`dew_point`],[`observations.pressure`,`mdi:gauge`,`pressure`]],Yt=[[`observations.gust`,`mdi:weather-windy-variant`,i.windGust],[`observations.gust_max`,`mdi:weather-windy-variant`,i.windGustMax],[`observations.rain_since_9am`,`mdi:weather-pouring`,i.rainSince9am],[`observations.rain_24h`,`mdi:weather-pouring`,i.rain24h],[`observations.temp_max`,`mdi:thermometer-chevron-up`,i.observedTempMax],[`observations.temp_min`,`mdi:thermometer-chevron-down`,i.observedTempMin],[`observations.delta_t`,`mdi:thermometer-water`,i.deltaT]],Xt=class extends W{static styles=[I,_`
      .readings {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
        gap: var(--ha-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .reading {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        width: 100%;
        min-width: 0;
        padding: var(--ha-space-2);
        border: var(--ha-border-width-sm) solid var(--divider-color);
        border-radius: var(--ha-border-radius-md);
        background: none;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      .reading:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      .reading ha-icon {
        color: var(--state-icon-color);
        flex: none;
      }
      .reading .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .reading .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .reading .value {
        font-weight: var(--ha-font-weight-medium);
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `];titleKey=`title.observations`;usesWeather=!0;entityKeys(){return[i.observedAt,i.windDirection,...Yt.map(([,,e])=>e)]}static getConfigForm(){return{schema:K(),computeLabel:q,computeHelper:J,assertConfig:e=>this.validateConfig(e)}}static getStubConfig(e){return G(e)}getCardSize(){return 4}renderBody(e){let t=this.weather,n=z(e,this.deviceId,i.observedAt),r=$(n?.attributes.station_name),a=n&&!Y(n)?Ot(e,n.state):void 0,o=r?a?u(e,`observations.station`,{station:r,time:a}):r:this.townName,s=Y(t)?U(`warning`,u(e,`state.unavailable`)):k`<ul class="readings">
          ${this.readings(e,t).map(t=>k`<li>
              <button class="reading" @click=${()=>this.moreInfo(t.entityId??this.weatherId)}>
                <ha-icon .icon=${t.icon} aria-hidden="true"></ha-icon>
                <span class="text">
                  <span class="label">${u(e,t.label)}</span>
                  <span class="value">${t.value}</span>
                </span>
              </button>
            </li>`)}
        </ul>`;return k`
      ${dt({title:this.cardTitle(),icon:`mdi:weather-cloudy-clock`,subtitle:o})}
      <div class="content">${s}</div>
    `}readings(e,t){let n=[];for(let[r,i,a]of Jt)t.attributes[a]!=null&&n.push({label:r,icon:i,value:Z(e,t,a)});if(t.attributes.wind_speed!=null){let r=z(e,this.deviceId,i.windDirection),a=r&&!Y(r)?`${r.state} `:``;n.push({label:`observations.wind`,icon:`mdi:weather-windy`,value:a+Z(e,t,`wind_speed`),entityId:r?.entity_id})}for(let[t,r,i]of Yt){let a=z(e,this.deviceId,i);a&&!Y(a)&&n.push({label:t,icon:r,value:wt(e,a),entityId:a.entity_id})}return n}},Zt=5,Qt=new Set([`new`,`update`,`renewal`,`upgrade`,`downgrade`,`final`]),$t={now:qt,forecast:Gt,warnings:class extends W{static properties={...W.properties,_expanded:{state:!0}};static styles=[I,_`
      .warnings {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3);
      }
      .warning {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--ha-space-1) var(--ha-space-3);
        padding-top: var(--ha-space-3);
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
      .warning:first-child {
        padding-top: 0;
        border-top: none;
      }
      .warning .body {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1);
        min-width: 0;
      }
      .warning .title {
        margin: 0;
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
      }
      .warning .badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-1);
      }
      details summary {
        cursor: pointer;
        width: fit-content;
        color: var(--primary-color);
        font-size: var(--ha-font-size-s);
      }
      details summary:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      details .message {
        margin: var(--ha-space-2) 0 0;
        white-space: pre-line;
        font-size: var(--ha-font-size-s);
        line-height: var(--ha-line-height-normal);
        max-height: 24rem;
        overflow-y: auto;
      }
    `];titleKey=`title.warnings`;constructor(){super(),this._expanded=!1}entityKeys(){return[i.warnings]}static validateConfig(e){super.validateConfig(e),ht(e,`max_items`,1,50)}static getConfigForm(){return{schema:[...K(),{name:`max_items`,default:Zt,selector:{number:{min:1,max:50,mode:`box`}}}],computeLabel:q,computeHelper:J,assertConfig:e=>this.validateConfig(e)}}static getStubConfig(e){return G(e)}getCardSize(){return 4}renderBody(e,t){let n=z(e,this.deviceId,i.warnings),r=Q(n?.state)??0,a=At(n?.attributes.warnings),o=t.max_items??Zt,s=this._expanded?a:a.slice(0,o),c;return c=Y(n)?U(`warning`,u(e,`state.unavailable`)):a.length===0?ut(`mdi:check-circle-outline`,u(e,`warnings.none`,{location:this.townName??``})):k`<div class="warnings" role="list">${s.map(t=>this.renderWarning(e,t))}</div>
        ${a.length>o?ft(e,this._expanded,a.length,()=>this._expanded=!this._expanded):j}`,k`
      ${dt({title:this.cardTitle(),icon:r?`mdi:alert`:`mdi:alert-outline`,count:r?ee(e,`warnings.count`,r):void 0,subtitle:this.townName,detailsLabel:this.cardTitle(),onDetails:n?()=>this.moreInfo(n.entity_id):void 0})}
      <div class="content">${c}</div>
    `}renderWarning(e,t){let n=$(t.title)??$(t.short_title)??``,r=zt(t.group_type),i=$(t.phase),a=[t.issued?u(e,`warnings.issued`,{time:Ot(e,t.issued)??``}):void 0,t.expires?u(e,`warnings.expires`,{time:kt(e,t.expires)??``}):void 0].filter(Boolean),o=$(t.message);return k`<div class="warning" role="listitem">
      ${lt(Rt(t.type),r)}
      <div class="body">
        <h3 class="title">${n}</h3>
        <div class="badges">
          ${t.short_title&&t.short_title!==n?H(t.short_title,r,`mdi:alert`):j}
          ${i&&Qt.has(i)?H(u(e,`warnings.phase.${i}`),`grey`):j}
        </div>
        ${a.length?k`<span class="secondary">${a.join(` · `)}</span>`:j}
        ${o?k`<details>
                <summary>${u(e,`warnings.show_message`)}</summary>
                <p class="message">${o}</p>
              </details>`:j}
      </div>
    </div>`}},observations:Xt},en=[{tag:n,ctor:yt,key:`all`},...Object.keys($t).map(e=>({tag:r[e],ctor:$t[e],key:e}))];function tn(e,t){let r=e.entities?.[t];return!t.startsWith(`weather.`)||r?.platform!==`bom_australia`||!r.device_id?null:{config:{type:`custom:${n}`,device:r.device_id}}}window.customCards=window.customCards||[];for(let{tag:t,ctor:n,key:r}of en)customElements.get(t)||customElements.define(t,n),window.customCards.some(e=>e.type===t)||window.customCards.push({type:t,name:u(void 0,`card.${r}.name`),description:u(void 0,`card.${r}.description`),preview:!0,documentationURL:e,...t===`bom-australia-card`?{getEntitySuggestion:tn}:{}});