package testutil

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/textproto"
)

func Ptr[V comparable](v V) *V {
	return &v
}

func CreateFormFile(writer *multipart.Writer, fieldname, filename, contentType string) io.Writer {
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fieldname, filename))
	header.Set("Content-Type", contentType)

	part, _ := writer.CreatePart(header)
	return part
}
