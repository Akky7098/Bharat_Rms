import React from "react";

import {
  Factory,
  MapPin,
  Package,
  UserRound,
} from "lucide-react";

import {
  formatMaterial,
  prettyProcessType,
  prettySupplyCondition,
} from "../orderTrackingUtils";

const MetaRow = ({
  icon: Icon,
  label,
  value,
  sub,
}) => (
  <div className="ot-side-row">
    <div className="ot-side-row__icon">
      <Icon size={15} />
    </div>

    <div>
      <span>{label}</span>
      <strong>
        {value || "—"}
      </strong>

      {sub ? (
        <small>{sub}</small>
      ) : null}
    </div>
  </div>
);

const OrderTrackingMetaCard = ({
  tracking,
}) => (
  <section className="ot-side-card">
    <div className="ot-side-card__head">
      <div>
        <span className="ot-eyebrow">
          ORDER SUMMARY
        </span>

        <h3>
          Order Details
        </h3>
      </div>
    </div>

    <div className="ot-side-card__body">
      <MetaRow
        icon={Factory}
        label="Supply Condition"
        value={prettySupplyCondition(
          tracking.supplyCondition
        )}
        sub={prettyProcessType(
          tracking.processType
        )}
      />

      <MetaRow
        icon={Package}
        label="Material"
        value={formatMaterial(
          tracking.material
        )}
      />

      <MetaRow
        icon={UserRound}
        label="Sales Person"
        value={
          tracking.salesPersonName ||
          "Not assigned"
        }
        sub={
          tracking.salesPersonEmail ||
          ""
        }
      />

      <MetaRow
        icon={UserRound}
        label="Customer Contact"
        value={
          tracking.contactPersonName
        }
        sub={
          tracking.contactPersonNumber
        }
      />

      <MetaRow
        icon={MapPin}
        label="Shipping Address"
        value={
          tracking.shippingAddress
        }
      />
    </div>
  </section>
);

export default OrderTrackingMetaCard;
