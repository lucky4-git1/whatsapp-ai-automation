import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contactApi } from '../../lib/api';
import { Link } from 'react-router-dom';
import CampaignBuilderModal from '../../components/campaigns/CampaignBuilderModal';

export default function AudiencesPage() {
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-audiences'],
    queryFn: () => contactApi.list({ limit: 200 }),
  });

  const contacts = (contactsData?.data?.data as any[]) || [];

  const optedInContacts = contacts.filter((c: any) => c.consentStatus === 'OPTED_IN');
  const optedOutContacts = contacts.filter((c: any) => c.consentStatus === 'OPTED_OUT');
  const pendingContacts = contacts.filter((c: any) => c.consentStatus === 'PENDING' || !c.consentStatus);
  const vipContacts = contacts.filter((c: any) => c.tags?.includes('vip') || c.tags?.includes('VIP'));

  const segments = [
    {
      id: 'opted-in',
      title: 'Opted-In Broadcast Cohort',
      description: 'Verified WhatsApp opt-in consent. Fully eligible for bulk marketing broadcasts.',
      count: optedInContacts.length,
      badge: '100% Eligible',
      badgeClass: 'bg-success',
      icon: 'fas fa-check-double text-success',
      canBroadcast: true,
    },
    {
      id: 'vip',
      title: 'VIP High-Value Customers',
      description: 'Contacts tagged as VIP clients for exclusive promotions and priority support.',
      count: vipContacts.length,
      badge: 'High Value',
      badgeClass: 'bg-primary',
      icon: 'fas fa-crown text-warning',
      canBroadcast: true,
    },
    {
      id: 'pending',
      title: 'Pending Consent / Unconfirmed',
      description: 'Contacts imported without verified consent. Must only receive transactional/utility messages.',
      count: pendingContacts.length,
      badge: 'Utility Only',
      badgeClass: 'bg-warning text-dark',
      icon: 'fas fa-clock text-warning',
      canBroadcast: false,
    },
    {
      id: 'opted-out',
      title: 'Suppressed & Opted-Out',
      description: 'Contacts who messaged STOP or unsubscribed. Outbound messages strictly blocked.',
      count: optedOutContacts.length,
      badge: 'Do Not Contact',
      badgeClass: 'bg-danger',
      icon: 'fas fa-ban text-danger',
      canBroadcast: false,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold">Audience Segments & Cohorts</h2>
          <p className="text-muted mb-0">
            Organize customer cohorts based on consent status, lifecycle tags, and broadcast eligibility.
          </p>
        </div>
        <button
          className="btn btn-success"
          onClick={() => setShowCampaignBuilder(true)}
        >
          <i className="fas fa-bullhorn me-2"></i> Launch Broadcast to Segment
        </button>
      </div>

      {/* Overview Cards */}
      <div className="row g-4 mb-4">
        {segments.map((seg) => (
          <div key={seg.id} className="col-md-6 col-lg-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="p-2 bg-light rounded">
                    <i className={`${seg.icon} fa-2x`}></i>
                  </div>
                  <span className={`badge ${seg.badgeClass}`}>{seg.badge}</span>
                </div>
                <h5 className="fw-bold mb-1">{seg.title}</h5>
                <p className="text-muted small flex-fill mb-3">{seg.description}</p>
                <div className="pt-3 border-top d-flex justify-content-between align-items-center mt-auto">
                  <div>
                    <span className="fs-4 fw-bold">{seg.count}</span>
                    <small className="text-muted ms-1">contacts</small>
                  </div>
                  {seg.canBroadcast ? (
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => setShowCampaignBuilder(true)}
                    >
                      Broadcast
                    </button>
                  ) : (
                    <Link to="/contacts" className="btn btn-sm btn-outline-secondary">
                      Review
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tag Directory */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0">Customer Segmentation Insights</h6>
        </div>
        <div className="card-body">
          <p className="small text-muted mb-3">
            Contacts in WhatsApp AI Automation are automatically tagged through inbound message analysis, import tags, or manual assignment.
          </p>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="p-3 bg-light rounded border">
                <div className="fw-semibold text-dark">VIP Cohort</div>
                <small className="text-muted d-block mb-2">High conversion rate and priority inbox routing.</small>
                <span className="badge bg-primary me-1">tag: vip</span>
                <span className="badge bg-secondary">tag: enterprise</span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-light rounded border">
                <div className="fw-semibold text-dark">Geographic Regional Segments</div>
                <small className="text-muted d-block mb-2">Targeted promotions in Telugu and English.</small>
                <span className="badge bg-success me-1">tag: hyderabad</span>
                <span className="badge bg-info text-dark me-1">tag: ap</span>
                <span className="badge bg-secondary">tag: tier-1</span>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-light rounded border">
                <div className="fw-semibold text-dark">Lifecycle Stage</div>
                <small className="text-muted d-block mb-2">Inbound lead qualification statuses.</small>
                <span className="badge bg-warning text-dark me-1">tag: new-lead</span>
                <span className="badge bg-dark">tag: demo-requested</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Builder Modal */}
      <CampaignBuilderModal
        show={showCampaignBuilder}
        onClose={() => setShowCampaignBuilder(false)}
      />
    </div>
  );
}
