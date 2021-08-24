// Copyright (C) The Arvados Authors. All rights reserved.
//
// SPDX-License-Identifier: AGPL-3.0

package localdb

import (
	"context"

	"git.arvados.org/arvados.git/lib/config"
	"git.arvados.org/arvados.git/lib/controller/rpc"
	"git.arvados.org/arvados.git/sdk/go/arvados"
	"git.arvados.org/arvados.git/sdk/go/arvadostest"
	"git.arvados.org/arvados.git/sdk/go/auth"
	"git.arvados.org/arvados.git/sdk/go/ctxlog"
	check "gopkg.in/check.v1"
)

var _ = check.Suite(&CollectionSuite{})

type CollectionSuite struct {
	cluster  *arvados.Cluster
	localdb  *Conn
	railsSpy *arvadostest.Proxy
}

func (s *CollectionSuite) TearDownSuite(c *check.C) {
	// Undo any changes/additions to the user database so they
	// don't affect subsequent tests.
	arvadostest.ResetEnv()
	c.Check(arvados.NewClientFromEnv().RequestAndDecode(nil, "POST", "database/reset", nil, nil), check.IsNil)
}

func (s *CollectionSuite) SetUpTest(c *check.C) {
	cfg, err := config.NewLoader(nil, ctxlog.TestLogger(c)).Load()
	c.Assert(err, check.IsNil)
	s.cluster, err = cfg.GetCluster("")
	c.Assert(err, check.IsNil)
	s.localdb = NewConn(s.cluster)
	s.railsSpy = arvadostest.NewProxy(c, s.cluster.Services.RailsAPI)
	*s.localdb.railsProxy = *rpc.NewConn(s.cluster.ClusterID, s.railsSpy.URL, true, rpc.PassthroughTokenProvider)
}

func (s *CollectionSuite) TearDownTest(c *check.C) {
	s.railsSpy.Close()
}

func (s *CollectionSuite) TestSignatures(c *check.C) {
	ctx := auth.NewContext(context.Background(), &auth.Credentials{Tokens: []string{arvadostest.ActiveTokenV2}})

	resp, err := s.localdb.CollectionGet(ctx, arvados.GetOptions{UUID: arvadostest.FooCollection})
	c.Check(err, check.IsNil)
	c.Check(resp.ManifestText, check.Matches, `(?ms).* acbd[^ ]*\+3\+A[0-9a-f]+@[0-9a-f]+ 0:.*`)

	resp, err = s.localdb.CollectionGet(ctx, arvados.GetOptions{UUID: arvadostest.FooCollection, Select: []string{"manifest_text"}})
	c.Check(err, check.IsNil)
	c.Check(resp.ManifestText, check.Matches, `(?ms).* acbd[^ ]*\+3\+A[0-9a-f]+@[0-9a-f]+ 0:.*`)

	lresp, err := s.localdb.CollectionList(ctx, arvados.ListOptions{Limit: -1, Filters: []arvados.Filter{{"uuid", "=", arvadostest.FooCollection}}})
	c.Check(err, check.IsNil)
	if c.Check(lresp.Items, check.HasLen, 1) {
		c.Check(lresp.Items[0].UUID, check.Equals, arvadostest.FooCollection)
		c.Check(lresp.Items[0].ManifestText, check.Equals, "")
		c.Check(lresp.Items[0].UnsignedManifestText, check.Equals, "")
	}

	lresp, err = s.localdb.CollectionList(ctx, arvados.ListOptions{Limit: -1, Filters: []arvados.Filter{{"uuid", "=", arvadostest.FooCollection}}, Select: []string{"manifest_text"}})
	c.Check(err, check.IsNil)
	if c.Check(lresp.Items, check.HasLen, 1) {
		c.Check(lresp.Items[0].ManifestText, check.Matches, `(?ms).* acbd[^ ]*\+3\+A[0-9a-f]+@[0-9a-f]+ 0:.*`)
		c.Check(lresp.Items[0].UnsignedManifestText, check.Equals, "")
	}

	lresp, err = s.localdb.CollectionList(ctx, arvados.ListOptions{Limit: -1, Filters: []arvados.Filter{{"uuid", "=", arvadostest.FooCollection}}, Select: []string{"unsigned_manifest_text"}})
	c.Check(err, check.IsNil)
	if c.Check(lresp.Items, check.HasLen, 1) {
		c.Check(lresp.Items[0].ManifestText, check.Equals, "")
		c.Check(lresp.Items[0].UnsignedManifestText, check.Matches, `(?ms).* acbd[^ ]*\+3 0:.*`)
	}
}
