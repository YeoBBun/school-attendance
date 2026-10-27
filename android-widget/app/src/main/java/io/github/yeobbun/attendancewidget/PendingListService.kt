package io.github.yeobbun.attendancewidget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import java.time.LocalDate

/** 위젯 목록의 줄들 */
class PendingListService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = Factory(applicationContext)

    private class Factory(private val ctx: Context) : RemoteViewsFactory {
        private var items: List<PendingItem> = emptyList()
        private var today = ""

        override fun onCreate() {}
        override fun onDestroy() {}

        override fun onDataSetChanged() {
            today = LocalDate.now().toString()
            items = Prefs(ctx).summary()?.sorted(today) ?: emptyList()
        }

        override fun getCount() = items.size
        override fun getViewTypeCount() = 1
        override fun hasStableIds() = false
        override fun getItemId(position: Int) = position.toLong()
        override fun getLoadingView(): RemoteViews? = null

        override fun getViewAt(position: Int): RemoteViews {
            val it = items[position]
            val v = RemoteViews(ctx.packageName, R.layout.widget_item)
            v.setTextViewText(R.id.who, it.who)
            v.setTextViewText(R.id.doc, it.doc)
            v.setTextViewText(R.id.detail, it.detail(today))
            v.setTextColor(R.id.detail, ctx.getColor(if (it.overdue(today)) R.color.overdue else R.color.muted))
            v.setOnClickFillInIntent(R.id.row, Intent())
            return v
        }
    }
}
