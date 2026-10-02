/// The legal documents a person accepts (backend: POLICY_DOCUMENTS in auth/constants). [slug] is the CMS page holding
/// the text; [policy] is the name the profile's `pendingPolicies` uses.
class PolicyDocument {
  const PolicyDocument({required this.policy, required this.slug, required this.title});

  final String policy;
  final String slug;
  final String title;
}

const List<PolicyDocument> kPolicyDocuments = [
  PolicyDocument(policy: 'TERMS_OF_SERVICE', slug: 'terms-and-conditions', title: 'Terms & Conditions'),
  PolicyDocument(policy: 'PRIVACY_POLICY', slug: 'privacy-policy', title: 'Privacy Policy'),
  PolicyDocument(policy: 'REWARD_POLICY', slug: 'reward-policy', title: 'Reward Policy'),
];
