package controller

import (
	"net/http"
	"one-api/setting/console_setting"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ListAnnouncements returns latest N (default 20) announcements already stored in console settings.
// Each announcement assumed to have fields: content, date, type(optional), note(optional)
func ListAnnouncements(c *gin.Context) {
	list := console_setting.GetAnnouncements()
	// sort by date desc if date exists
	sort.SliceStable(list, func(i, j int) bool {
		di, _ := time.Parse(time.RFC3339, getString(list[i]["date"]))
		dj, _ := time.Parse(time.RFC3339, getString(list[j]["date"]))
		return di.After(dj)
	})
	if len(list) > 20 {
		list = list[:20]
	}
	// sanitize content field (basic allowlist: a,b,strong,em,code,pre,ul,ol,li,p,br,span,img[src],h1-h4)
	for _, ann := range list {
		if raw, ok := ann["content"].(string); ok {
			ann["content"] = sanitizeHTML(raw)
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"items": list}})
}

func getString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

var (
	tagPattern  = regexp.MustCompile(`<(/?)([a-zA-Z0-9]+)([^>]*)>`)
	allowedTags = map[string]bool{"a": true, "b": true, "strong": true, "em": true, "code": true, "pre": true, "ul": true, "ol": true, "li": true, "p": true, "br": true, "span": true, "img": true, "h1": true, "h2": true, "h3": true, "h4": true}
	attrPattern = regexp.MustCompile(`([a-zA-Z0-9:_-]+)\s*=\s*"([^"]*)"`)
)

func sanitizeHTML(s string) string {
	// remove script/style blocks entirely
	s = regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`).ReplaceAllString(s, "")
	s = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`).ReplaceAllString(s, "")
	// handle tags
	var b strings.Builder
	last := 0
	matches := tagPattern.FindAllStringSubmatchIndex(s, -1)
	for _, m := range matches {
		b.WriteString(s[last:m[0]])
		full := s[m[0]:m[1]]
		closing := s[m[2]:m[3]] == "/"
		tag := strings.ToLower(s[m[4]:m[5]])
		attrs := s[m[6]:m[7]]
		if allowedTags[tag] {
			if closing {
				b.WriteString("</" + tag + ">")
			} else {
				// filter attributes (allow href, src, alt, title, class)
				allowedAttrs := map[string]bool{"href": true, "src": true, "alt": true, "title": true, "class": true}
				attrParts := attrPattern.FindAllStringSubmatch(attrs, -1)
				var kept []string
				for _, ap := range attrParts {
					name := strings.ToLower(ap[1])
					val := ap[2]
					if allowedAttrs[name] {
						// rudimentary javascript: filtering
						if strings.HasPrefix(strings.ToLower(val), "javascript:") {
							continue
						}
						kept = append(kept, name+"=\""+val+"\"")
					}
				}
				// self-closing for br/img
				if tag == "br" {
					b.WriteString("<br>")
				} else if tag == "img" {
					b.WriteString("<img " + strings.Join(kept, " ") + ">")
				} else {
					if len(kept) > 0 {
						b.WriteString("<" + tag + " " + strings.Join(kept, " ") + ">")
					} else {
						b.WriteString("<" + tag + ">")
					}
				}
			}
		} else {
			// drop disallowed tag entirely
			_ = full
		}
		last = m[1]
	}
	b.WriteString(s[last:])
	return b.String()
}
