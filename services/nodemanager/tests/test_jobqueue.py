#!/usr/bin/env python

from __future__ import absolute_import, print_function

import unittest

import arvnodeman.jobqueue as jobqueue
from . import testutil

class ServerCalculatorTestCase(unittest.TestCase):
    def make_calculator(self, factors, **kwargs):
        return jobqueue.ServerCalculator(
            [(testutil.MockSize(n), {'cores': n}) for n in factors], **kwargs)

    def calculate(self, servcalc, *constraints):
        return servcalc.servers_for_queue(
            [{'runtime_constraints': cdict} for cdict in constraints])

    def test_empty_queue_needs_no_servers(self):
        servcalc = self.make_calculator([1])
        self.assertEqual([], servcalc.servers_for_queue([]))

    def test_easy_server_count(self):
        servcalc = self.make_calculator([1])
        servlist = self.calculate(servcalc, {'min_nodes': 3})
        self.assertEqual(3, len(servlist))

    def test_implicit_server_count(self):
        servcalc = self.make_calculator([1])
        servlist = self.calculate(servcalc, {}, {'min_nodes': 3})
        self.assertEqual(4, len(servlist))

    def test_bad_min_nodes_override(self):
        servcalc = self.make_calculator([1])
        servlist = self.calculate(servcalc,
                                  {'min_nodes': -2}, {'min_nodes': 'foo'})
        self.assertEqual(2, len(servlist))

    def test_ignore_unsatisfiable_jobs(self):
        servcalc = self.make_calculator([1], max_nodes=9)
        servlist = self.calculate(servcalc,
                                  {'min_cores_per_node': 2},
                                  {'min_ram_mb_per_node': 256},
                                  {'min_nodes': 6},
                                  {'min_nodes': 12},
                                  {'min_scratch_mb_per_node': 200})
        self.assertEqual(6, len(servlist))


class JobQueueMonitorActorTestCase(testutil.RemotePollLoopActorTestMixin,
                                   unittest.TestCase):
    TEST_CLASS = jobqueue.JobQueueMonitorActor

    class MockCalculator(object):
        @staticmethod
        def servers_for_queue(queue):
            return [testutil.MockSize(n) for n in queue]


    def build_monitor(self, side_effect, *args, **kwargs):
        super(JobQueueMonitorActorTestCase, self).build_monitor(*args, **kwargs)
        self.client.jobs().queue().execute.side_effect = side_effect

    def test_subscribers_get_server_lists(self):
        self.build_monitor([{'items': [1, 2]}], self.MockCalculator())
        self.monitor.subscribe(self.subscriber)
        self.wait_for_call(self.subscriber)
        self.subscriber.assert_called_with([testutil.MockSize(1),
                                            testutil.MockSize(2)])


if __name__ == '__main__':
    unittest.main()

