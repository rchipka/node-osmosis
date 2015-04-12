/** css2xpath - generic CSS to XPath selector transformer
 * @author      Andrea Giammarchi
 * @license     Mit Style License
 * @blog        http://webreflection.blogspot.com/
 * @project     http://code.google.com/p/css2xpath/
 * @version     0.1 - Converts correctly every SlickSpeed CSS selector [http://mootools.net/slickspeed/]
 * @note        stand alone vice-versa subproject [http://code.google.com/p/css2xpath/]
 * @info        http://www.w3.org/TR/CSS2/selector.html
 * @credits     some tips from Aristotle Pagaltzis [http://plasmasturm.org/log/444/]
 */
var normal = "normalize-space()";
var lower = "translate(normalize-space(), 'ABCDEFGHJIKLMNOPQRSTUVWXYZ', 'abcdefghjiklmnopqrstuvwxyz')";
var css2xpath = (function(){
    var re      = [
            /([^\\])'(.*[^\\])'/g, '$1"$2"',
            /([^\\])"(.*[^\\])"/g, function(s, a, b) {
                return a+'"'+b.replace(/\\'/g, "'").replace(/ /g, "\\ ")+'"';
            },
            // add @ for attribs
            /\[([^\/\.\]~\@\$\*\^\|\!0-9]+)(=[^\]]+)?\]/g, "[@$1$2]",
            // multiple queries
            /\s*,\s*/g, "|",
            // , + ~ >
            /\s*(\+|~|>|<|\^)\s*/g, "$1",
            //* ~ + >
            /([a-zA-Z0-9\_\-\*])~([a-zA-Z0-9\_\-\*])/g, "$1/following-sibling::$2",
            /([a-zA-Z0-9\_\-\*])\+([a-zA-Z0-9\_\-\*])/g, "$1/following-sibling::*[1]/self::$2",
            /([a-zA-Z0-9\_\-\*\)])>([a-zA-Z0-9\_\-\*])/g, "$1/$2",
            /*
            /([a-zA-Z0-9\]\_\-\*\)])<~([a-zA-Z0-9\_\-\*])/g, "$1/preceding-sibling::$2",
            /([a-zA-Z0-9\]\_\-\*\)])<([a-zA-Z0-9\_\-\*])/g, "$1/preceding::$2",
            */
            /([a-zA-Z0-9\]\_\-\*])\^([a-zA-Z0-9\_\-\*])/g, "$1/ancestor::$2",
            // all unescaped stuff escaped
            /\[([^=]+)=([^'|"][^\]]*)\]/g, "[$1='$2']",
            // all descendant or self to //
            /(^|[^a-zA-Z0-9\_\-\*])(#|\.)([a-zA-Z0-9\_\-]+)/g, "$1*$2$3",
            /([\\]*[\>\+\|\~\,\s])([a-zA-Z\*]+)/g, function(s, a, b) {
                if (s.charAt(0) == '\\')
                    return s;
                else
                    return a+'//'+b;
            },
            /\s+\/\//g, '//',
            // :has
            /:(has|before|before-sibling)\(([^\)]*[\)]*)[\)]/g, function(s, a, b){
                var prefix = './/';
                if (a === 'before')
                    prefix += 'following::';
                else if (a === 'before-sibling')
                    prefix += 'following-sibling::';
                return String().concat("[count(", (css2xpath(prefix+b)), ") > 0]");
            },
            // :not
            /:not\(([^\)]*[\)]*)[\)]/g, function(s, a){ return String().concat("[not(", (css2xpath(a).replace(/^[^\[]*\[([^\]]*)\].*$/g, "$1")), ")]"); },
            // :first-child
            /([a-zA-Z0-9\_\-\*]+):first-child/g, "*[1]/self::$1",
            // :last-child
            /([a-zA-Z0-9\_\-\*]+):last-child/g, "$1[not(following-sibling::*)]",
            // :only-child
            /([a-zA-Z0-9\_\-\*]+):only-child/g, "*[last()=1]/self::$1",
            // :empty
            /:empty/g, "[not(*) and not(normalize-space())]",
            // :nth-child
            /([a-zA-Z0-9\_\-\*]+):nth-child\(([^\)]*)\)/g, function(s, a, b){
            switch(b){
                case    "n":
                    return a;
                case    "even":
                    return "*[position() mod 2=0 and position()>=0]/self::" + a;
                case    "odd":
                    return a + "[(count(preceding-sibling::*) + 1) mod 2=1]";
                default:
                    b = (b || "0").replace(/^([0-9]*)n.*?([0-9]*)$/, "$1+$2").split("+");
                    b[1] = b[1] || "0";
                    return "*[(position()-".concat(b[1], ") mod ", b[0], "=0 and position()>=", b[1], "]/self::", a);
                }
            },
            // :contains(selectors)
            /:i?contains\("?([^\)]*?)"?\)/g, function(s, a){
                return "[contains("+(s.charAt(1)==='i'?lower:normal)+',"' + a.replace("\\ ", ' ') + '")]';
            },
            // |= attrib
            /\[([a-zA-Z0-9\_\-]+)\|=([^\]]+)\]/g, "[@$1=$2 or starts-with(@$1,concat($2,'-'))]",
            // *= attrib
            /\[([a-zA-Z0-9\_\-]+)\*=([^\]]+)\]/g, "[contains(@$1,$2)]",
            // ~= attrib
            /\[([a-zA-Z0-9\_\-]+)~=([^\]]+)\]/g, "[contains(concat(' ',normalize-space(@$1),' '),concat(' ',$2,' '))]",
            // ^= attrib
            /\[([a-zA-Z0-9\_\-]+)\^=([^\]]+)\]/g, "[starts-with(@$1,$2)]",
            // $= attrib
            /\[([a-zA-Z0-9\_\-]+)\$=([^\]]+)\]/g, function(s, a, b){return "[substring(@".concat(a, ",string-length(@", a, ")-", b.length - 3, ")=", b, "]");},
            // != attrib
            /\[([a-zA-Z0-9\_\-]+)\!=([^\]]+)\]/g, "[not(@$1) or @$1!=$2]",
            // ids
            /#([a-zA-Z0-9\_\-]+)/g, "[@id='$1']",
            // classes
            /\.([a-zA-Z0-9\_\-]+)/g, "[contains(concat(' ',normalize-space(@class),' '),' $1 ')]",
            // :nth-of-type x[n] shortcut
            /\[([0-9]+)\]/g, ":nth-of-type($1)",
            // normalize multiple filters
            /\]\[([^\]]+[^\[]*)\]/g, " and ($1)]",
            
            
            
            // extra
            
            // :checked
            /:(checked|selected)/g, "[@selected or @checked]",
            // :starts-with
            /:i?starts-with\("?([^\)]*?)"?\)/g, function(s, a){
                return "[starts-with("+(s.charAt(1)==='i'?lower:normal)+',"' + a.replace("\\ ", ' ') + '")]';
            },
            // :ends-with
            /:i?ends-with\("?([^\)]*?)"?\)/g, function(s, a){
                var str = normal;
                var search = a.replace("\\ ", ' ');
                if (s.charAt(1)==='i') {
                    search = search.toLowerCase();
                    str = lower;
                }
                return "[substring("+str+",string-length(" + str + ') - ' + search.length + "+1) = '"+search+"']";
            },
            // :first(n), limit(n)
            /:(first(-of-type)?|limit)\(([0-9]+)\)/g, "[position() <= $3]",
            // :first or :first-of-type
            /:first(-of-type)?/g, "[1]",
            // :last(n)
            /:last(-of-type)?\(([0-9]+)\)/g, "[position()>last()-$2]",
            // :last or :last-of-type
            /:last(-of-type)?/g, "[last()]",
            // :skip(n)
            /:skip(-first)?\(([0-9]+)\)/g, "[position() > $2]",
            // :skip-last(n)
            /:skip-last\(([0-9]+)\)/g, "[last()-position() > $1]",
            // :range(n,n)
            /:range\(([0-9]+)\|([0-9]+)\)/g, "[$1 <= position() and position() <= $2]",
            // :odd
            /:odd/g, ":nth-of-type(odd)",
            // :even
            /:even/g, ":nth-of-type(even)",
            // :nth-of-type
            /:nth-of-type\(([^\)]*)\)/g, function(s, a){
                if (a.match(/^[0-9]+$/))
                    return '['+a+']';
                switch(a){
                    case    "even":
                        return "[position() mod 2=0 and position()>=0]";
                    case    "odd":
                        return "[position() mod 2=1]";
                    default:
                        a = (a || "0").replace(/^([-0-9]*)n.*?([0-9]*)$/, "$1+$2").split("+");
                        a[1] = a[1] || "0";
                        return "*[(position()-".concat(a[1], ") mod ", a[0], "=0 and position()>=", a[1], "]");
                }
            },
        ],
        length  = re.length
    ;
    return function css2xpath(s){
        var i = 0;
        while(i < length)
            s = s.replace(re[i++], re[i++]);
        return s;
    };
})();
module.exports = css2xpath;