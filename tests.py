import sys, types, json, unittest, importlib.util, copy
from pathlib import Path
class E(Exception):pass
class Contract:
 def __new__(cls):
  x=super().__new__(cls);x.polls={};return x
sender=types.SimpleNamespace(as_hex='owner');answer={}
def strict(f):
 a=f();b=f()
 if a!=b:raise E('Independent intent differs')
 return a
gl=types.ModuleType('genlayer');gl.contract=types.SimpleNamespace(Contract=Contract);gl.storage=types.SimpleNamespace(TreeMap=dict);gl.message=types.SimpleNamespace(sender_address=sender);gl.vm=types.SimpleNamespace(UserError=E);gl.public=types.SimpleNamespace(write=lambda f:f,view=lambda f:f);gl.nondet=types.SimpleNamespace(exec_prompt=lambda *a,**k:copy.deepcopy(answer));gl.eq_principle=types.SimpleNamespace(strict_eq=strict)
gt=types.ModuleType('genlayer.types');gt.u256=int;sys.modules['genlayer']=gl;sys.modules['genlayer.types']=gt
spec=importlib.util.spec_from_file_location('intentpoll_contract',Path(__file__).parent/'contract.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
TEXT='I prefer the interactive walkthrough rather than the static API reference.'
class Tests(unittest.TestCase):
 def setUp(self):
  global answer
  sender.as_hex='owner';self.c=m.IntentPoll();self.c.create_poll('Synthetic docs pilot','Which documentation format should this test poll pilot?',json.dumps(['Static API reference','Interactive walkthrough']));self.c.cast_ballot('1',TEXT);answer={'option_id':2,'quote':'prefer the interactive walkthrough'}
 def state(self):return json.loads(self.c.get_poll('1'))
 def confirmed(self):self.c.classify('1');self.c.confirm('1');return self.state()
 def test_submitted_not_counted(self):self.assertEqual(self.state()['tally'],[0,0])
 def test_classified_not_counted(self):self.c.classify('1');self.assertEqual(self.state()['tally'],[0,0])
 def test_confirmation_counts(self):self.assertEqual(self.confirmed()['tally'],[0,1])
 def test_confirm_before_classify(self):
  with self.assertRaises(E):self.c.confirm('1')
 def test_no_double_confirm(self):
  self.confirmed()
  with self.assertRaises(E):self.c.confirm('1')
  self.assertEqual(self.state()['tally'],[0,1])
 def test_ambiguous_not_confirmable(self):
  answer['option_id']=0;answer['quote']='';self.c.classify('1')
  with self.assertRaises(E):self.c.confirm('1')
  self.assertEqual(self.state()['tally'],[0,0])
 def test_revise_removes_old_count(self):
  self.confirmed();self.c.cast_ballot('1','I now choose the static API reference for this pilot.');self.assertEqual(self.state()['tally'],[0,0]);self.assertEqual(len(self.state()['ballots']['owner']),2)
 def test_revised_confirmation_moves_count(self):
  self.confirmed();self.c.cast_ballot('1','I now choose the static API reference for this pilot.');answer.update(option_id=1,quote='choose the static API reference');self.c.classify('1');self.c.confirm('1');self.assertEqual(self.state()['tally'],[1,0])
 def test_withdraw_removes_count(self):
  self.confirmed();self.c.withdraw('1');self.assertEqual(self.state()['tally'],[0,0]);self.assertEqual(self.state()['ballots']['owner'][0]['events'],['submitted','classified','confirmed','withdrawn'])
 def test_other_wallet_cannot_confirm(self):
  self.c.classify('1');sender.as_hex='other'
  with self.assertRaises(E):self.c.confirm('1')
 def test_other_wallet_cannot_withdraw(self):
  self.confirmed();sender.as_hex='other'
  with self.assertRaises(E):self.c.withdraw('1')
 def test_only_owner_closes(self):
  sender.as_hex='other'
  with self.assertRaises(E):self.c.close_poll('1')
 def test_close_freezes_tally(self):
  self.confirmed();self.c.close_poll('1');self.assertEqual(self.state()['tally'],[0,1])
  for f in [lambda:self.c.cast_ballot('1','A replacement ballot message.'),lambda:self.c.withdraw('1'),lambda:self.c.confirm('1'),lambda:self.c.classify('1')]:
   with self.assertRaises(E):f()
 def test_new_wallet_is_independent(self):
  self.confirmed();sender.as_hex='other';self.c.cast_ballot('1','I also prefer the interactive walkthrough for the pilot.');answer['quote']='prefer the interactive walkthrough';self.c.classify('1');self.c.confirm('1');self.assertEqual(self.state()['tally'],[0,2]);self.assertEqual(self.state()['wallet_count'],2)
 def test_options_case_insensitive_duplicates(self):
  with self.assertRaises(E):self.c.create_poll('Duplicates','An explicit question here?',json.dumps(['Same option','same OPTION']))
 def test_option_count_bounds(self):
  for o in [['Single option'],['Option '+str(i) for i in range(7)]]:
   with self.assertRaises(E):self.c.create_poll('Bounds','Which option is preferred?',json.dumps(o))
 def test_bool_option_rejected(self):
  answer['option_id']=True
  with self.assertRaises(E):self.c.classify('1')
 def test_out_of_range_rejected(self):
  answer['option_id']=3
  with self.assertRaises(E):self.c.classify('1')
 def test_invented_quote_rejected(self):
  answer['quote']='An invented preference quote'
  with self.assertRaises(E):self.c.classify('1')
 def test_ambiguous_cannot_quote(self):
  answer['option_id']=0
  with self.assertRaises(E):self.c.classify('1')
 def test_revision_limit(self):
  self.c.cast_ballot('1','A second different ballot message.');self.c.cast_ballot('1','A third different ballot message.')
  with self.assertRaises(E):self.c.cast_ballot('1','A fourth different ballot message.')
 def test_identical_revision_rejected(self):
  with self.assertRaises(E):self.c.cast_ballot('1',TEXT)
 def test_reclassify_not_allowed(self):
  self.c.classify('1')
  with self.assertRaises(E):self.c.classify('1')
 def test_independent_disagreement_is_atomic(self):
  before=self.state();old=gl.nondet.exec_prompt;calls=[]
  def varied(*a,**k):calls.append(1);return copy.deepcopy(answer) if len(calls)==1 else {'option_id':0,'quote':''}
  gl.nondet.exec_prompt=varied
  try:
   with self.assertRaises(E):self.c.classify('1')
   self.assertEqual(before,self.state())
  finally:gl.nondet.exec_prompt=old
 def test_original_hashes_preserved(self):
  initial=self.state();self.confirmed();self.c.cast_ballot('1','A different current preference message.');s=self.state();self.assertEqual(initial['options_sha256'],s['options_sha256']);self.assertEqual(initial['ballots']['owner'][0]['text_sha256'],s['ballots']['owner'][0]['text_sha256'])
if __name__=='__main__':unittest.main()
