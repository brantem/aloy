package testutil

func Ptr[V comparable](v V) *V {
	return &v
}
